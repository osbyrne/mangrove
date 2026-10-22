import { S3Client } from "bun";
import { Context, Effect, Layer } from "effect";

export class StorageError {
  readonly _tag = "StorageError";
  constructor(readonly kind: "missing" | "unavailable") {}
}

export class ObjectStorage extends Context.Service<ObjectStorage, {
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

/** Configuration is captured by the layer, with no ambient AWS credential fallback. */
export function makeStorageLayer(config: StorageConfig = storageConfigFromEnv()) {
  return Layer.sync(ObjectStorage, () => {
    let client: S3Client | undefined;
    try {
      if (config.accessKeyId && config.secretAccessKey) {
        client = new S3Client({
          endpoint: config.endpoint ?? "http://127.0.0.1:9091",
          bucket: "music",
          region: "us-east-1",
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          sessionToken: "",
          // Bun calls forcePathStyle:true virtualHostedStyle:false.
          virtualHostedStyle: false,
        });
      }
    } catch {
      // Invalid storage configuration must not prevent catalog/static requests.
    }

    return ObjectStorage.of({
      request: (key, method, requestSignal, range) => Effect.tryPromise({
        try: async (effectSignal) => {
          if (!client) throw new StorageError("unavailable");
          const timeout = new AbortController();
          const timer = setTimeout(() => timeout.abort(), 10_000);
          let upstream: Response;
          try {
            upstream = await fetch(client.presign(key, { method, expiresIn: 60 }), {
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
