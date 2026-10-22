import { createApp } from "./app";
import { createHttpServer } from "./http";

export { createApp, makeRequestHandlerLayer, RequestHandler } from "./app";
export { makeStorageLayer, ObjectStorage, StorageError, storageConfigFromEnv } from "./storage";
export { parseByteRange } from "./range";
export { catalog, track } from "./catalog";
export { createHttpServer } from "./http";

const app = createApp();
export const runtime = app.runtime;
export const handleRequest = app.handleRequest;

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  const server = createHttpServer(handleRequest);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Mangrove backend listening on http://127.0.0.1:${port}`);
  });

  const shutdown = async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => { server.close(() => resolve()); });
    await app.dispose();
  };
  process.once("SIGTERM", () => { void shutdown(); });
  process.once("SIGINT", () => { void shutdown(); });
}
