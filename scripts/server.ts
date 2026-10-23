import { createApp } from "../apps/api/src/app";
import { createHttpServer } from "../apps/api/src/http";
import { listenHost } from "../apps/api/src/network";
import { defaultDistDir } from "../apps/api/src/paths";
import { makeStorageLayer, createStorageClient, storageReady } from "../apps/api/src/storage";
import { initializeStorage, registerLegacyTrack, configPath, dataDir } from "./storage";
import { version } from "../package.json";

/** Runs the API in this process; compiled binaries never spawn TypeScript source files. */
export async function startServer() {
  const host = listenHost();
  const port = Number(process.env.PORT ?? 3000);
  const storagePort = Number(process.env.S3_PORT ?? 9091);
  if (![port, storagePort].every(p => Number.isInteger(p) && p > 0 && p < 65536) || port === storagePort) {
    throw new Error("PORT and S3_PORT must be distinct integers from 1 to 65535");
  }
  if (!await Bun.file(`${defaultDistDir}/index.html`).exists()) throw new Error("Frontend assets are missing. Run bun run build first.");
  for (const [hostname, probePort] of [[host, port], ["127.0.0.1", storagePort]] as const) {
    const probe = Bun.listen({ hostname, port: probePort, socket: { data() {} } });
    probe.stop(true);
  }
  const credentials = await initializeStorage();
  const endpoint = `http://127.0.0.1:${storagePort}`;
  const child = Bun.spawn(["rclone", "--config", configPath, "serve", "s3", "vault:",
    "--addr", `127.0.0.1:${storagePort}`, "--dir-cache-time", "5m", "--vfs-cache-mode", "off",
    "--vfs-read-chunk-size", "4M", "--vfs-read-chunk-size-limit", "32M", "--vfs-read-chunk-streams", "8",
  ], {
    env: { ...process.env, RCLONE_AUTH_KEY: `"${credentials.accessKeyId},${credentials.secretAccessKey}"`, RCLONE_CONFIG_VAULT_REMOTE: `${dataDir}/objects` },
    stdout: "inherit", stderr: "inherit",
  });
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
      child.kill("SIGTERM");
      await Promise.race([child.exited, Bun.sleep(2000)]);
      if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; }
    })();
  }
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    const client = createStorageClient({ endpoint, ...credentials });
    let ready = false;
    try {
      for (let attempt = 0; attempt < 50 && child.exitCode === null && !stopping; attempt++) {
        try { if (await storageReady(client)) { ready = true; break; } } catch {}
        await Bun.sleep(100);
      }
    } finally { client.destroy(); }
    if (!ready || stopping) throw new Error("Local S3 storage did not become ready.");
    await registerLegacyTrack();
    if (stopping) throw new Error("Startup cancelled");
    app = createApp({ storageLayer: makeStorageLayer({ endpoint, ...credentials }) });
    http = createHttpServer(app.handleRequest);
    await new Promise<void>((resolve, reject) => {
      http!.once("error", reject);
      http!.listen(port, host, () => { http!.removeListener("error", reject); resolve(); });
    });
    void child.exited.then(() => {
      if (!stopping) {
        console.error("Local S3 storage stopped; shutting down Mangrove.");
        process.exitCode = 1;
        void stop();
      }
    });
    console.log(`Mangrove ${version} → http://${host}:${port}\nData → ${dataDir}\nPrivate S3 → ${endpoint}`);
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
    console.log("Usage: mangrove-server [--version|--help]\nHOST=127.0.0.1 PORT=3000 S3_PORT=9091 MANGROVE_DATA_DIR=./.data\nRequires rclone on PATH. The API, frontend and local S3 start together.");
  } else if (args.length) {
    console.error("Unknown arguments. Use --help.");
    process.exitCode = 1;
  } else {
    try { await startServer(); }
    catch (error) { console.error(error instanceof Error ? error.message : "Startup failed"); process.exitCode = 1; }
  }
}
