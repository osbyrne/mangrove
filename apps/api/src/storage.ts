import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { lstat, mkdir, rename, unlink } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Context, Effect, Layer } from "effect";
import { dataDir } from "./paths";

export class StorageError {
  readonly _tag = "StorageError";
  constructor(readonly kind: "missing" | "unavailable") {}
}

export class ObjectStorage extends Context.Service<ObjectStorage, {
  readonly health: () => Effect.Effect<void, StorageError>;
  readonly put: (key: string, file: Bun.BunFile, signal: AbortSignal) => Effect.Effect<void, StorageError>;
  readonly remove: (key: string, signal: AbortSignal) => Effect.Effect<void, StorageError>;
  readonly request: (
    key: string,
    method: "GET" | "HEAD",
    signal: AbortSignal,
    range?: string,
  ) => Effect.Effect<Response, StorageError>;
}>()("mangrove/ObjectStorage") {}

const objectKeyPattern = /^songs\/[A-Za-z0-9-]+\.(?:mp3|m4a|flac|wav|ogg|opus)$/i;

function objectPath(root: string, key: string) {
  if (!objectKeyPattern.test(key)) throw new StorageError("unavailable");
  const path = resolve(root, key.slice("songs/".length));
  const pathFromRoot = relative(root, path);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === "") {
    throw new StorageError("unavailable");
  }
  return path;
}

function rangeBounds(range: string | undefined, size: number) {
  if (!range) return undefined;
  const match = /^bytes=(\d+)-(\d+)$/.exec(range);
  if (!match) throw new StorageError("unavailable");
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= size) {
    throw new StorageError("unavailable");
  }
  return { start, end };
}

/** Stores song bytes as ordinary files under <dataDir>/songs. */
export function makeStorageLayer(root = resolve(dataDir, "songs")) {
  const storageRoot = resolve(root);
  return Layer.sync(ObjectStorage, () => ObjectStorage.of({
    health: () => Effect.tryPromise({
      try: async () => {
        await mkdir(storageRoot, { recursive: true, mode: 0o700 });
        const info = await lstat(storageRoot);
        if (!info.isDirectory() || info.isSymbolicLink()) throw new StorageError("unavailable");
      },
      catch: () => new StorageError("unavailable"),
    }),
    put: (key, file, signal) => Effect.tryPromise({
      try: async () => {
        const path = objectPath(storageRoot, key);
        await mkdir(dirname(path), { recursive: true, mode: 0o700 });
        const parent = await lstat(dirname(path));
        if (!parent.isDirectory() || parent.isSymbolicLink()) throw new StorageError("unavailable");
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
          await pipeline(
            Readable.fromWeb(file.stream() as unknown as NodeReadableStream<Uint8Array>),
            createWriteStream(temporary, { flags: "wx", mode: 0o600 }),
            { signal },
          );
          await rename(temporary, path);
        } catch (error) {
          await unlink(temporary).catch(() => {});
          throw error;
        }
      },
      catch: () => new StorageError("unavailable"),
    }),
    remove: (key, signal) => Effect.tryPromise({
      try: async () => {
        if (signal.aborted) throw new StorageError("unavailable");
        await unlink(objectPath(storageRoot, key)).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      },
      catch: () => new StorageError("unavailable"),
    }),
    request: (key, method, signal, range) => Effect.tryPromise({
      try: async () => {
        if (signal.aborted) throw new StorageError("unavailable");
        const path = objectPath(storageRoot, key);
        let info;
        try { info = await lstat(path); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new StorageError("missing");
          throw error;
        }
        if (!info.isFile() || info.isSymbolicLink()) throw new StorageError("unavailable");
        const bounds = rangeBounds(range, info.size);
        const start = bounds?.start ?? 0;
        const end = bounds?.end ?? info.size - 1;
        const length = bounds ? end - start + 1 : info.size;
        const headers = new Headers({
          "Content-Length": String(length),
          "Content-Type": "application/octet-stream",
          "Accept-Ranges": "bytes",
          "Content-Encoding": "identity",
        });
        if (bounds) headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
        const status = bounds ? 206 : 200;
        if (method === "HEAD") return new Response(null, { status, headers });
        const file = Bun.file(path);
        const body = bounds ? file.slice(start, end + 1) : file;
        return new Response(body, { status, headers });
      },
      catch: (error) => error instanceof StorageError ? error : new StorageError("unavailable"),
    }),
  }));
}
