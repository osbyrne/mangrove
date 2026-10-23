import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { projectRoot } from "../apps/api/src/paths";
import { version } from "../package.json";

const binary = resolve(Bun.argv[2] ?? join(projectRoot, "dist/mangrove-server"));
const rclone = Bun.which("rclone");
if (!rclone) throw new Error("Install rclone to smoke-test the binary");
const root = await mkdtemp(join(tmpdir(), "mangrove-binary-"));
const tools = join(root, "tools");
await mkdir(tools);
await symlink(rclone, join(tools, "rclone"));
function freePort() {
  const listener = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const port = listener.port;
  listener.stop(true);
  return port;
}
const port = freePort();
let storagePort = freePort();
while (storagePort === port) storagePort = freePort();
const env = { ...process.env, PATH: tools, HOST: "127.0.0.1", PORT: String(port), S3_PORT: String(storagePort), MANGROVE_DATA_DIR: join(root, "data") };
const origin = `http://127.0.0.1:${port}`;
function spawnBinary() { return Bun.spawn([binary], { cwd: root, env, stdout: "pipe", stderr: "pipe" }); }
let child: ReturnType<typeof spawnBinary> | undefined;
let logs: Promise<string[]> | undefined;
async function stop() {
  if (!child) return;
  child.kill("SIGTERM");
  await Promise.race([child.exited, Bun.sleep(5000)]);
  if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; throw new Error("Binary did not shut down gracefully"); }
  assert.equal(child.exitCode, 0, "Binary exited unsuccessfully");
  child = undefined;
}
async function start() {
  child = spawnBinary();
  logs = Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Binary exited: ${(await logs).join("\n")}`);
    try { if ((await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await Bun.sleep(100);
  }
  throw new Error("Binary did not become healthy");
}
try {
  const info = Bun.spawn([binary, "--version"], { cwd: root, env, stdout: "pipe", stderr: "pipe" });
  assert.equal((await new Response(info.stdout).text()).trim(), version);
  assert.equal(await info.exited, 0);
  assert(!await Bun.file(join(root, "data/catalog.sqlite")).exists(), "--version created a database");
  await start();
  const page = await fetch(origin);
  assert.equal(page.status, 200, "Embedded frontend is missing");
  const html = await page.text();
  const assetPaths = [...html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)].map(match => match[1]!);
  assert(assetPaths.some(path => path.endsWith(".js")), "Missing embedded frontend script");
  for (const path of assetPaths) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, `Embedded asset missing: ${path}`);
    await response.body?.cancel();
  }
  const wav = new Uint8Array(44 + 2048);
  const view = new DataView(wav.buffer);
  const text = (offset: number, value: string) => wav.set(new TextEncoder().encode(value), offset);
  text(0, "RIFF"); view.setUint32(4, wav.length - 8, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, 2048, true);
  const uploaded = await fetch(`${origin}/api/tracks?filename=smoke.wav`, { method: "POST", body: wav, headers: { Origin: origin } });
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const { track } = await uploaded.json() as { track: { streamUrl: string } };
  const full = await fetch(`${origin}${track.streamUrl}`);
  assert.deepEqual(new Uint8Array(await full.arrayBuffer()), wav);
  const partial = await fetch(`${origin}${track.streamUrl}`, { headers: { Range: "bytes=4-15" } });
  assert.equal(partial.status, 206);
  assert.deepEqual(new Uint8Array(await partial.arrayBuffer()), wav.slice(4, 16));
  for (const path of ["/.data/rclone.conf", "/.data/catalog.sqlite", "/scripts/server.ts"]) {
    assert.equal((await fetch(`${origin}${path}`)).status, 404, path);
  }
  await stop();
  await start();
  const catalog = await (await fetch(`${origin}/api/tracks`)).json() as { tracks: { streamUrl: string }[] };
  assert.equal(catalog.tracks[0]?.streamUrl, track.streamUrl, "Catalog did not survive restart");
  const persisted = await fetch(`${origin}${track.streamUrl}`);
  assert.deepEqual(new Uint8Array(await persisted.arrayBuffer()), wav);
  console.log("Binary verified without Bun or source files: version, embedded frontend/assets, S3 upload, full/range streaming, private paths, shutdown and restart persistence.");
} catch (error) {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  if (logs) console.error((await logs).join("\n"));
  throw error;
} finally {
  await stop();
  await rm(root, { recursive: true, force: true });
}
