import { createApp } from "../apps/api/src/app";
import { createHttpServer } from "../apps/api/src/http";
import { listenHost } from "../apps/api/src/network";
import { defaultDistDir } from "../apps/api/src/paths";
import { makeStorageLayer } from "../apps/api/src/storage";
import { initializeStorage, registerLegacyTrack, dataDir } from "./storage";
import { version } from "../package.json";

/** Runs the API in this process; compiled binaries never spawn TypeScript source files. */
export async function startServer() {
  const host = listenHost();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) throw new Error("PORT must be an integer from 1 to 65535");
  if (!await Bun.file(`${defaultDistDir}/index.html`).exists()) throw new Error("Frontend assets are missing. Run bun run build first.");
  const probe = Bun.listen({ hostname: host, port, socket: { data() {} } });
  probe.stop(true);
  let app: ReturnType<typeof createApp> | undefined;
  let http: ReturnType<typeof createHttpServer> | undefined;
  let stopping: Promise<void> | undefined;
  const onSignal = () => { void stop(); };
  function stop(): Promise<void> {
    return stopping ??= (async () => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      http?.closeAllConnections();
      if (http?.listening) await new Promise<void>(resolve => http!.close(() => resolve()));
      await app?.dispose();
    })();
  }
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    await initializeStorage();
    if (stopping) throw new Error("Startup cancelled");
    await registerLegacyTrack();
    if (stopping) throw new Error("Startup cancelled");
    app = createApp({ storageLayer: makeStorageLayer() });
    http = createHttpServer(app.handleRequest);
    await new Promise<void>((resolve, reject) => {
      http!.once("error", reject);
      http!.listen(port, host, () => { http!.removeListener("error", reject); resolve(); });
    });
    console.log(`Mangrove ${version} → http://${host}:${port}\nData → ${dataDir}\nSongs → ${dataDir}/songs`);
    return { stop, host, port };
  } catch (error) {
    await stop();
    throw error;
  }
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.length === 1 && args[0] === "--version") console.log(version);
  else if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: mangrove [--version|--help]\nHOST=127.0.0.1 PORT=3000 MANGROVE_DATA_DIR=./.data\nSongs are stored as ordinary files in MANGROVE_DATA_DIR/songs.");
  } else if (args.length) {
    console.error("Unknown arguments. Use --help.");
    process.exitCode = 1;
  } else {
    try { await startServer(); }
    catch (error) { console.error(error instanceof Error ? error.message : "Startup failed"); process.exitCode = 1; }
  }
}
