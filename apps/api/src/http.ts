import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

export type HttpHandler = (request: Request) => Promise<Response>;

/**
 * Bun's node:http transport preserves Content-Length for incremental responses.
 * Bun.serve replaces it with chunked framing for an unfinished ReadableStream.
 */
export function createHttpServer(handleRequest: HttpHandler) {
  return createServer((incoming, outgoing) => {
    void serveRequest(incoming, outgoing, handleRequest);
  });
}

async function serveRequest(incoming: IncomingMessage, outgoing: ServerResponse, handleRequest: HttpHandler) {
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  const onClose = () => { if (!outgoing.writableFinished) abort.abort(); };
  incoming.once("aborted", onAbort);
  outgoing.once("close", onClose);
  try {
    const headers = new Headers();
    for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
      headers.append(incoming.rawHeaders[index]!, incoming.rawHeaders[index + 1]!);
    }
    let request: Request;
    try {
      request = new Request(`http://127.0.0.1${incoming.url ?? "/"}`, {
        method: incoming.method,
        headers,
        signal: abort.signal,
      });
    } catch {
      outgoing.writeHead(400, { "Content-Type": "application/json" });
      outgoing.end('{"error":"Invalid request"}');
      return;
    }
    // Routes are read-only; rejected request bodies do not need buffering.
    incoming.resume();
    const response = await handleRequest(request);
    if (abort.signal.aborted) {
      await response.body?.cancel();
      return;
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (request.method === "HEAD" || !response.body) {
      await response.body?.cancel();
      outgoing.end();
      return;
    }
    // pipeline forwards backpressure and destroys/cancels the upstream on disconnect.
    // Bun's node:stream/web declarations add helpers absent from the DOM stream type.
    const body = response.body as unknown as NodeReadableStream<Uint8Array>;
    await pipeline(Readable.fromWeb(body), outgoing, { signal: abort.signal });
  } catch {
    if (!outgoing.destroyed) {
      if (outgoing.headersSent) outgoing.destroy();
      else {
        outgoing.writeHead(503, { "Content-Type": "application/json" });
        outgoing.end(incoming.method === "HEAD" ? undefined : '{"error":"Storage unavailable"}');
      }
    }
  } finally {
    incoming.removeListener("aborted", onAbort);
    outgoing.removeListener("close", onClose);
  }
}
