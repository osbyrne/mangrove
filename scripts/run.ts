import { projectRoot, dataDir, configPath, ensureTrack, initializeStorage } from "./storage";

const mode = Bun.argv[2] ?? "dev";
if (mode !== "dev" && mode !== "start") throw new Error("Use dev or start.");
const credentials = await initializeStorage();
await ensureTrack();
if (mode === "start" && !await Bun.file(`${projectRoot}/apps/web/dist/index.html`).exists()) {
  throw new Error("Build the frontend first with bun run build.");
}
const port = Number(process.env.PORT ?? 3000);
const storagePort = Number(process.env.S3_PORT ?? 9091);
if (![port, storagePort].every(p => Number.isInteger(p) && p > 0 && p < 65536)) throw new Error("Invalid PORT or S3_PORT.");
if (mode === "dev" && port !== 3000) throw new Error("Development uses PORT=3000 for the Vite API proxy. Use bun start for a custom port.");
// Refuse existing listeners; never reuse or stop somebody else's storage server.
for (const p of [port, storagePort, ...(mode === "dev" ? [5173] : [])]) {
  const probe = Bun.listen({ hostname: "127.0.0.1", port: p, socket: { data() {} } });
  probe.stop(true);
}
const children: ReturnType<typeof Bun.spawn>[] = [];
let stopping = false;
async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  await Promise.race([Promise.all(children.map(c => c.exited)), Bun.sleep(2000)]);
  for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
  process.exit(code);
}
process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));
function spawn(command: string[], env: Record<string, string | undefined> = {}) {
  const child = Bun.spawn(command, { cwd: projectRoot, env: { ...process.env, ...env }, stdout: "inherit", stderr: "inherit" });
  children.push(child);
  void child.exited.then(code => {
    if (!stopping) { console.error(`${command[0]} exited (${code}); stopping the stack.`); void stop(code || 1); }
  });
  return child;
}
const endpoint = `http://127.0.0.1:${storagePort}`;
spawn(["rclone", "--config", configPath, "serve", "s3", "vault:",
  "--addr", `127.0.0.1:${storagePort}`, "--read-only", "--dir-cache-time", "5m",
  "--vfs-cache-mode", "off", "--vfs-read-chunk-size", "4M",
  "--vfs-read-chunk-size-limit", "32M", "--vfs-read-chunk-streams", "8",
], {
  RCLONE_AUTH_KEY: `"${credentials.accessKeyId},${credentials.secretAccessKey}"`,
  RCLONE_CONFIG_VAULT_REMOTE: `${dataDir}/objects`,
});
try {
  const s3 = new Bun.S3Client({ endpoint, bucket: "music", region: "us-east-1", virtualHostedStyle: false, ...credentials });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if (await s3.file("red-white-beige.m4a").exists()) { ready = true; break; } } catch {}
    await Bun.sleep(100);
  }
  if (!ready) throw new Error("Local S3 storage did not become ready.");
  spawn([process.execPath, ...(mode === "dev" ? ["--watch"] : []), "apps/api/src/index.ts"], {
    PORT: String(port), S3_ENDPOINT: endpoint, S3_BUCKET: "music",
    S3_ACCESS_KEY_ID: credentials.accessKeyId, S3_SECRET_ACCESS_KEY: credentials.secretAccessKey,
  });
  if (mode === "dev") spawn([process.execPath, "run", "--filter", "@mangrove/web", "dev"]);
  console.log(`\nMangrove → http://127.0.0.1:${mode === "dev" ? 5173 : port}\nPrivate storage → ${endpoint}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Startup failed.");
  await stop(1);
}
await new Promise(() => {});
