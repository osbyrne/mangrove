import { S3Client, GetObjectCommand, HeadObjectCommand, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Context, Effect, Layer } from "effect";

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

export interface StorageConfig {
  readonly endpoint?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
}

export function storageConfigFromEnv(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  return {
    endpoint: env.S3_ENDPOINT ?? "http://127.0.0.1:9091",
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  };
}

/** Only literal loopback endpoints are accepted; never contact a remote S3 service. */
export function createStorageClient(config: StorageConfig): S3Client {
  const endpoint = new URL(config.endpoint ?? "http://127.0.0.1:9091");
  if (!['127.0.0.1', '[::1]'].includes(endpoint.hostname) ||
      endpoint.protocol !== "http:" || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash) {
    throw new Error("S3 endpoint must be an HTTP loopback origin");
  }
  if (!config.accessKeyId || !config.secretAccessKey) throw new Error("Missing local S3 credentials");
  return new S3Client({
    endpoint: endpoint.origin,
    region: "us-east-1",
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: true,
    retryMode: "standard",
    maxAttempts: 1,
  });
}

export function signStorageRequest(client: S3Client, key: string, method: "GET" | "HEAD", range?: string) {
  const input = { Bucket: "music", Key: key, ...(range ? { Range: range } : {}) };
  return getSignedUrl(client, method === "HEAD" ? new HeadObjectCommand(input) : new GetObjectCommand(input), { expiresIn: 60 });
}

export async function storageReady(client: S3Client) {
  const url = await getSignedUrl(client, new HeadBucketCommand({ Bucket: "music" }), { expiresIn: 60 });
  const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2000), redirect: "error" });
  await response.body?.cancel();
  return response.ok;
}

/** Configuration is captured by the layer, with no ambient AWS credential fallback. */
export function makeStorageLayer(config: StorageConfig = storageConfigFromEnv()) {
  return Layer.sync(ObjectStorage, () => {
    let client: S3Client | undefined;
    try {
      client = createStorageClient(config);
    } catch {
      // Invalid storage configuration must not prevent catalog/static requests.
    }

    return ObjectStorage.of({
      health: () => Effect.tryPromise({
        try: async () => { if (!client || !await storageReady(client)) throw new StorageError("unavailable"); },
        catch: () => new StorageError("unavailable"),
      }),
      put: (key, file, signal) => Effect.tryPromise({
        try: async () => {
          if (!client) throw new StorageError("unavailable");
          const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: "music", Key: key }), { expiresIn: 900 });
          const response = await fetch(url, { method: "PUT", body: file, signal, redirect: "error" });
          await response.body?.cancel();
          if (!response.ok) throw new StorageError("unavailable");
        },
        catch: () => new StorageError("unavailable"),
      }),
      remove: (key, signal) => Effect.tryPromise({
        try: async () => {
          if (!client) throw new StorageError("unavailable");
          const url = await getSignedUrl(client, new DeleteObjectCommand({ Bucket: "music", Key: key }), { expiresIn: 60 });
          const response = await fetch(url, { method: "DELETE", signal, redirect: "error" });
          await response.body?.cancel();
          if (!response.ok) throw new StorageError("unavailable");
        },
        catch: () => new StorageError("unavailable"),
      }),
      request: (key, method, requestSignal, range) => Effect.tryPromise({
        try: async (effectSignal) => {
          if (!client) throw new StorageError("unavailable");
          const timeout = new AbortController();
          const timer = setTimeout(() => timeout.abort(), 10_000);
          let upstream: Response;
          try {
            upstream = await fetch(await signStorageRequest(client, key, method, range), {
              method,
              headers: range ? { Range: range, "Accept-Encoding": "identity" } : { "Accept-Encoding": "identity" },
              signal: AbortSignal.any([requestSignal, effectSignal, timeout.signal]),
              redirect: "error",
            });
          } finally {
            // Only time out response headers; long audio streams may run indefinitely.
            clearTimeout(timer);
          }
          if (upstream.status === 404) {
            await upstream.body?.cancel();
            throw new StorageError("missing");
          }
          if (!upstream.ok) {
            await upstream.body?.cancel();
            throw new StorageError("unavailable");
          }
          return upstream;
        },
        // Neither upstream bodies, signed URLs, credentials nor exception text reach clients.
        catch: (error) => error instanceof StorageError ? error : new StorageError("unavailable"),
      }),
    });
  });
}
