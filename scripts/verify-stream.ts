import assert from "node:assert/strict";
import { configPath, dataDir, objectPath, projectRoot } from "./storage";

const base = (process.env.VERIFY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const trackId = process.env.VERIFY_TRACK_ID ?? "red-white-beige";
const streamUrl = `${base}/api/tracks/${encodeURIComponent(trackId)}/stream`;
const source = Bun.argv[2];
// Use an original file for end-to-end integrity, or decrypt the private vault as a baseline.
let original: Uint8Array;
if (source) original = new Uint8Array(await Bun.file(source).arrayBuffer());
else {
  const proc = Bun.spawn(["rclone", "--config", configPath, "cat", objectPath], {
    stdout: "pipe", stderr: "inherit", cwd: projectRoot,
    env: { ...process.env, RCLONE_CONFIG_VAULT_REMOTE: `${dataDir}/objects` },
  });
  original = new Uint8Array(await new Response(proc.stdout).arrayBuffer());
  assert.equal(await proc.exited, 0, "Could not read baseline from the vault.");
}
const size = original.length;
assert(size > 0);
const health = await fetch(`${base}/api/health`);
assert.equal(health.status, 200);
assert.equal((await health.json() as { storage: string }).storage, "connected");
const catalog = await fetch(`${base}/api/tracks`).then(r => r.json()) as { tracks: { streamUrl: string }[] };
assert(catalog.tracks.some(track => `${base}${track.streamUrl}` === streamUrl), "Track is missing from the catalog");
assert(!JSON.stringify(catalog).includes("9091"), "Catalog exposed a private storage URL.");

const head = await fetch(streamUrl, { method: "HEAD" });
assert.equal(head.status, 200);
assert.equal(head.headers.get("content-length"), String(size));
assert.equal(head.headers.get("accept-ranges"), "bytes");
assert.equal((await head.arrayBuffer()).byteLength, 0);

const full = await fetch(streamUrl);
assert.equal(full.status, 200);
assert.match(full.headers.get("content-type") ?? "", /audio\/mp4/);
assert.equal(full.headers.get("content-length"), String(size));
// Hash incrementally, as a media consumer would read the response.
const hash = new Bun.CryptoHasher("sha256");
let received = 0;
for await (const chunk of full.body!) { hash.update(chunk); received += chunk.byteLength; }
assert.equal(received, size);
assert.equal(hash.digest("hex"), new Bun.CryptoHasher("sha256").update(original).digest("hex"));

for (const [range, start, end] of [
  ["bytes=0-99", 0, 99],
  ["bytes=100000-100099", 100000, 100099],
  [`bytes=${size - 128}-`, size - 128, size - 1],
  ["bytes=-128", size - 128, size - 1],
  [`bytes=${size - 10}-${size + 100}`, size - 10, size - 1],
] as const) {
  const response = await fetch(streamUrl, { headers: { Range: range } });
  assert.equal(response.status, 206, range);
  assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${size}`);
  assert.equal(response.headers.get("content-length"), String(end - start + 1));
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), original.slice(start, end + 1));
}
const invalid = await fetch(streamUrl, { headers: { Range: `bytes=${size}-` } });
assert.equal(invalid.status, 416);
assert.equal(invalid.headers.get("content-range"), `bytes */${size}`);
await invalid.body?.cancel();
for (const path of [
  "/api/tracks/missing/stream", "/api/missing", "/.data/rclone.conf", "/.data/s3.json",
  "/server/index.ts", "/apps/api/src/index.ts", "/scripts/storage.ts",
  `/@fs${projectRoot}/.data/rclone.conf`, `/@fs${projectRoot}/apps/api/src/storage.ts`,
  `/@fs${projectRoot}/node_modules/@mangrove/api/src/storage.ts`,
]) {
  const response = await fetch(`${base}${path}`);
  assert([403, 404].includes(response.status), `${path} should be inaccessible, received ${response.status}`);
  await response.body?.cancel();
}
console.log(`Verified health, catalog, HEAD, SHA-256 integrity (${size.toLocaleString()} bytes), five seek ranges, 416, and private-file routing at ${base}.`);
