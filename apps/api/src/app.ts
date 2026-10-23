import { realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { defaultDistDir, standalone } from "./paths";
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import type { HealthResponse } from "@mangrove/shared";
import { SongLibrary } from "./library";
import type { StoredTrack } from "./library";
import { makeUploader } from "./upload";
import { parseByteRange } from "./range";
import { makeStorageLayer, ObjectStorage, StorageError } from "./storage";

const jsonError = (status: number, error: string) => Response.json({ error }, { status });
const unavailable = () => jsonError(503, "Storage unavailable");
const notFound = () => jsonError(404, "Not found");

export class RequestHandler extends Context.Service<RequestHandler, {
  readonly handle: (request: Request) => Effect.Effect<Response>;
}>()("mangrove/RequestHandler") {}

function storageSize(response: Response): number | undefined {
  const length = response.headers.get("Content-Length");
  const size = length !== null && /^\d+$/.test(length) ? Number(length) : NaN;
  const encoding = response.headers.get("Content-Encoding");
  return Number.isSafeInteger(size) && size >= 0 && (!encoding || encoding === "identity")
    ? size
    : undefined;
}

function objectMetadata(storage: ObjectStorage["Service"], request: Request, track: StoredTrack) {
  return Effect.gen(function*() {
    const response = yield* storage.request(track.objectKey, "HEAD", request.signal);
    const size = storageSize(response);
    yield* Effect.promise(async () => { await response.body?.cancel(); });
    if (response.status !== 200 || size === undefined) {
      return yield* Effect.fail(new StorageError("unavailable"));
    }
    return size;
  });
}

function streamTrack(storage: ObjectStorage["Service"], request: Request, track: StoredTrack) {
  return Effect.gen(function*() {
    const size = yield* objectMetadata(storage, request, track);
    const range = parseByteRange(request.headers.get("Range"), size);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Content-Type": track.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (range.kind === "unsatisfiable") {
      headers.set("Content-Range", `bytes */${size}`);
      headers.set("Content-Length", "0");
      return new Response(null, { status: 416, headers });
    }

    const partial = range.kind === "partial";
    const length = partial ? range.end - range.start + 1 : size;
    const contentRange = partial ? `bytes ${range.start}-${range.end}/${size}` : null;
    headers.set("Content-Length", String(length));
    if (contentRange) headers.set("Content-Range", contentRange);
    const status = partial ? 206 : 200;
    if (request.method === "HEAD") return new Response(null, { status, headers });

    const upstream = yield* storage.request(
      track.objectKey,
      "GET",
      request.signal,
      partial ? `bytes=${range.start}-${range.end}` : undefined,
    );
    if (
      // rclone's S3 server sends 200 for ranged reads, with correct range metadata.
      (upstream.status !== status && !(partial && upstream.status === 200)) ||
      storageSize(upstream) !== length ||
      upstream.headers.get("Content-Range") !== contentRange ||
      (length > 0 && !upstream.body)
    ) {
      yield* Effect.promise(async () => { await upstream.body?.cancel(); });
      return yield* Effect.fail(new StorageError("unavailable"));
    }
    // Forward the original stream: backpressure and cancellation reach fetch/S3.
    return new Response(upstream.body, { status, headers });
  }).pipe(Effect.catch((error) => Effect.succeed(
    error.kind === "missing" ? jsonError(404, "Track not found") : unavailable(),
  )));
}

const publicExtensions = new Set([
  ".html", ".js", ".css", ".json", ".webmanifest", ".ico", ".png", ".jpg", ".jpeg",
  ".svg", ".webp", ".avif", ".gif", ".woff", ".woff2", ".ttf", ".otf", ".txt", ".xml",
]);
const privateSegments = new Set([
  "src", "server", "scripts", "tests", "node_modules", "package.json", "package-lock.json",
  "tsconfig.json", "bun.lock", "bun.lockb",
]);

function inside(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path);
  return pathFromRoot === "" || (!isAbsolute(pathFromRoot) && pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`));
}

async function publicFile(distDir: string, path: string): Promise<Bun.BunFile | undefined> {
  try {
    // Embedded directories are immutable and do not support realpath; disk roots still resolve symlinks.
    const embedded = standalone && distDir === defaultDistDir;
    const root = embedded ? distDir : await realpath(distDir);
    const candidate = embedded ? resolve(root, `.${path}`) : await realpath(resolve(root, `.${path}`));
    if (!inside(root, candidate) || !(await stat(candidate)).isFile()) return undefined;
    return Bun.file(candidate);
  } catch {
    return undefined;
  }
}

function serveFrontend(request: Request, path: string, distDir: string) {
  return Effect.tryPromise({
    try: async () => {
      const segments = path.split("/").filter(Boolean);
      if (
        path.includes("\\") || /[\x00-\x1f\x7f]/.test(path) ||
        segments.some((segment) => segment.startsWith(".") || privateSegments.has(segment.toLowerCase()))
      ) return notFound();

      const extension = extname(path).toLowerCase();
      if (extension && !publicExtensions.has(extension)) return notFound();
      let file = await publicFile(distDir, path);
      if (!file) {
        // Only extensionless page URLs can use the SPA shell. Missing assets stay 404.
        const accepts = request.headers.get("Accept");
        if (extension || (accepts && !accepts.includes("text/html") && !accepts.includes("*/*"))) {
          return notFound();
        }
        file = await publicFile(distDir, "/index.html");
      }
      if (!file) return notFound();
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Length": String(file.size),
          "X-Content-Type-Options": "nosniff",
        },
      });
    },
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.succeed(notFound())));
}

export function makeRequestHandlerLayer(distDir = defaultDistDir, library = new SongLibrary(), allowedOrigins: ReadonlySet<string> = new Set()) {
  return Layer.effect(RequestHandler, Effect.gen(function*() {
    const storage = yield* ObjectStorage;
    const upload = makeUploader(library, storage, allowedOrigins);
    return RequestHandler.of({
      handle: (request) => Effect.gen(function*() {
        let path: string;
        try {
          path = decodeURIComponent(new URL(request.url).pathname);
        } catch {
          return jsonError(400, "Invalid URL");
        }
        const streamMatch = /^\/api\/tracks\/([^/]+)\/stream$/.exec(path);
        const track = streamMatch ? library.find(streamMatch[1]!) : undefined;
        const isApi = path === "/api" || path.startsWith("/api/");
        if (isApi && path !== "/api/tracks" && path !== "/api/health" && !track) {
          return notFound();
        }
        if (path === "/api/tracks" && request.method === "POST") {
          return yield* Effect.promise(() => upload(request));
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
        }
        if (path === "/api/tracks") return Response.json({ tracks: library.list() });
        if (track) return yield* streamTrack(storage, request, track);
        if (path === "/api/health") {
          return yield* storage.health().pipe(
            Effect.map(() => Response.json({ status: "ok", storage: "connected" } satisfies HealthResponse)),
            Effect.catch(() => Effect.succeed(Response.json(
              { status: "error", storage: "unavailable" }, { status: 503 },
            ))),
          );
        }
        return yield* serveFrontend(request, path, distDir);
      }).pipe(Effect.map((response) => request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response)),
    });
  }));
}

export interface AppOptions {
  readonly storageLayer?: Layer.Layer<ObjectStorage>;
  readonly distDir?: string;
  readonly library?: SongLibrary;
  readonly allowedOrigins?: readonly string[];
}

/** Each app owns its runtime. Tests and embedders should dispose it when finished. */
export function createApp(options: AppOptions = {}) {
  const allowedOrigins = new Set(options.allowedOrigins ?? (process.env.MANGROVE_WEB_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean));
  for (const origin of allowedOrigins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" || parsed.origin !== origin) throw new Error("MANGROVE_WEB_ORIGINS must contain exact HTTPS origins");
  }
  const library = options.library ?? new SongLibrary();
  const runtime = ManagedRuntime.make(makeRequestHandlerLayer(options.distDir, library, allowedOrigins).pipe(
    Layer.provide(options.storageLayer ?? makeStorageLayer()),
  ));
  const dispatch = async (request: Request): Promise<Response> => {
    try {
      return await runtime.runPromise(
        Effect.flatMap(RequestHandler, (handler) => handler.handle(request)),
        { signal: request.signal },
      );
    } catch {
      const response = unavailable();
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }
  };
  const handleRequest = async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    const isApi = new URL(request.url).pathname.startsWith("/api/");
    if (!isApi || !origin || !allowedOrigins.has(origin)) return dispatch(request);
    let response: Response;
    if (request.method === "OPTIONS") {
      const method = request.headers.get("Access-Control-Request-Method") ?? "";
      const headers = (request.headers.get("Access-Control-Request-Headers") ?? "").toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
      if (!["GET", "HEAD", "POST"].includes(method) || headers.some(header => !["content-type", "range"].includes(header))) {
        return jsonError(403, "Cross-origin request is not allowed");
      }
      response = new Response(null, { status: 204 });
      response.headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
      response.headers.set("Access-Control-Allow-Private-Network", "true");
    } else response = await dispatch(request);
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.append("Vary", "Origin");
    response.headers.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length");
    return response;
  };
  return { runtime, handleRequest, fetch: handleRequest, dispose: async () => { await runtime.dispose(); if (!options.library) library.close(); } };
}
