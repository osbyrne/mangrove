import { mkdtemp, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Effect } from "effect";
import type { SongLibrary, StoredTrack } from "./library";
import type { ObjectStorage } from "./storage";

export const maxUploadBytes = 250 * 1024 * 1024;
const formats: Record<string, string> = {
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".flac": "audio/flac",
  ".wav": "audio/wav", ".ogg": "audio/ogg", ".opus": "audio/ogg",
};
class UploadError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function matchesFormat(header: Uint8Array, extension: string) {
  const text = new TextDecoder("latin1").decode(header);
  if (extension === ".m4a") return text.slice(4, 8) === "ftyp";
  if (extension === ".flac") return text.startsWith("fLaC");
  if (extension === ".wav") return text.startsWith("RIFF") && text.slice(8, 12) === "WAVE";
  if (extension === ".ogg" || extension === ".opus") return text.startsWith("OggS");
  return text.startsWith("ID3") || (header[0] === 0xff && ((header[1] ?? 0) & 0xe0) === 0xe0);
}

/** Bound memory and disk use, validate format, then publish only after S3 acknowledges the PUT. */
export function makeUploader(library: SongLibrary, storage: ObjectStorage["Service"], allowedOrigins: ReadonlySet<string> = new Set()) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    if (!((origin && allowedOrigins.has(origin))) && ((origin && origin !== new URL(request.url).origin) || request.headers.get("Sec-Fetch-Site") === "cross-site")) {
      return Response.json({ error: "Cross-origin uploads are not allowed" }, { status: 403 });
    }
    if (active >= 2) return Response.json({ error: "Two uploads are already running. Try again shortly." }, { status: 429 });
    const filename = new URL(request.url).searchParams.get("filename")?.trim();
    if (!filename || filename.length > 240 || /[\x00-\x1f\x7f/\\]/.test(filename)) {
      return Response.json({ error: "A valid filename is required" }, { status: 400 });
    }
    const extension = extname(filename).toLowerCase();
    const contentType = formats[extension];
    if (!contentType) return Response.json({ error: "Supported formats: MP3, M4A, FLAC, WAV, OGG and Opus" }, { status: 415 });
    if (Number(request.headers.get("Content-Length")) > maxUploadBytes) {
      return Response.json({ error: "Songs must be 250 MiB or smaller" }, { status: 413 });
    }
    if (!request.body) return Response.json({ error: "The song is empty" }, { status: 400 });
    active++;
    let directory: string | undefined;
    try {
      directory = await mkdtemp(join(tmpdir(), "mangrove-upload-"));
      const path = join(directory, "audio");
      let size = 0;
      const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > maxUploadBytes) throw new UploadError(413, "Songs must be 250 MiB or smaller");
          controller.enqueue(chunk);
        },
      }));
      await pipeline(Readable.fromWeb(bounded as unknown as NodeReadableStream<Uint8Array>), createWriteStream(path, { mode: 0o600 }), { signal: request.signal });
      const file = Bun.file(path);
      if (size === 0) throw new UploadError(400, "The song is empty");
      if (!matchesFormat(new Uint8Array(await file.slice(0, 12).arrayBuffer()), extension)) {
        throw new UploadError(415, "The file contents do not match the audio format");
      }
      const id = crypto.randomUUID();
      const track: StoredTrack = {
        id, filename, title: filename.slice(0, -extension.length) || filename,
        artist: "Private collection", recordedAt: new Date().toISOString().slice(0, 10),
        uploadedAt: new Date().toISOString().slice(0, 10),
        contentType, objectKey: `songs/${id}${extension}`, streamUrl: `/api/tracks/${id}/stream`,
      };
      await Effect.runPromise(storage.put(track.objectKey, file, request.signal), { signal: request.signal });
      try { library.add(track); }
      catch (error) {
        await Effect.runPromise(storage.remove(track.objectKey, AbortSignal.timeout(10_000))).catch(() => {});
        throw error;
      }
      const { objectKey, ...publicTrack } = track;
      return Response.json({ track: publicTrack }, { status: 201 });
    } catch (error) {
      return Response.json({ error: error instanceof UploadError ? error.message : "Upload failed. Please try again." }, {
        status: error instanceof UploadError ? error.status : 503,
      });
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true });
      active--;
    }
  };
}
