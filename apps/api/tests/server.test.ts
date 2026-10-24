import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp as makeApp } from "../src/app";
import { SongLibrary } from "../src/library";
import { track } from "../src/catalog";
function createApp(options: Parameters<typeof makeApp>[0] = {}) {
  const library = new SongLibrary(":memory:");
  library.add({ ...track, streamUrl: `/api/tracks/${track.id}/stream` });
  cleanups.push(() => library.close());
  return makeApp({ ...options, library });
}
import { makeStorageLayer } from "../src/storage";

const cleanups: Array<() => unknown | Promise<unknown>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const streamPath = "/api/tracks/red-white-beige/stream";
const request = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init);
const payload = "0123456789";

function storageApp() {
  const root = mkdtempSync(join(tmpdir(), "mangrove-storage-test-"));
  const songsDir = join(root, "songs");
  mkdirSync(songsDir, { recursive: true });
  writeFileSync(join(songsDir, "red-white-beige.m4a"), payload);
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const app = createApp({ storageLayer: makeStorageLayer(songsDir) });
  cleanups.push(app.dispose);
  return { app, songsDir };
}

describe("track streaming from local files", () => {
  test("full GET streams the song file", async () => {
    const { app } = storageApp();
    const response = await app.handleRequest(request(streamPath));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mp4");
    expect(response.headers.get("Content-Length")).toBe("10");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.has("Content-Range")).toBe(false);
    expect(await response.text()).toBe(payload);
  });

  test.each([
    ["bytes=2-5", "2345", "bytes 2-5/10"],
    ["bytes=7-", "789", "bytes 7-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=8-999999999999999999999999", "89", "bytes 8-9/10"],
    ["bytes=-999999999999999999999999", payload, "bytes 0-9/10"],
    ["bytes=0-0", "0", "bytes 0-0/10"],
  ])("serves %s with exact partial headers and bytes", async (range, expected, contentRange) => {
    const { app } = storageApp();
    const response = await app.handleRequest(request(streamPath, { headers: { Range: range } }));
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(contentRange);
    expect(response.headers.get("Content-Length")).toBe(String(expected.length));
    expect(await response.text()).toBe(expected);
  });

  test.each(["bytes=10-", "bytes=4-2", "bytes=-0", "bytes=", "bytes=0-1,4-5", "items=0-1"])(
    "rejects %s before reading song bytes", async (range) => {
      const { app } = storageApp();
      const response = await app.handleRequest(request(streamPath, { headers: { Range: range } }));
      expect(response.status).toBe(416);
      expect(response.headers.get("Content-Range")).toBe("bytes */10");
      expect(response.headers.get("Content-Length")).toBe("0");
      expect(await response.text()).toBe("");
    },
  );

  test.each([null, "bytes=2-5", "bytes=-2", "bytes=50-"])("HEAD %s returns headers without audio", async (range) => {
    const { app } = storageApp();
    const response = await app.handleRequest(request(streamPath, {
      method: "HEAD", headers: range ? { Range: range } : {},
    }));
    expect(response.status).toBe(range === null ? 200 : range === "bytes=50-" ? 416 : 206);
    expect(response.headers.get("Content-Length")).toBe(
      range === null ? "10" : range === "bytes=50-" ? "0" : range === "bytes=-2" ? "2" : "4",
    );
    expect(response.body).toBeNull();
    expect(await response.text()).toBe("");
  });

  test("health checks the local songs directory", async () => {
    const { app } = storageApp();
    const response = await app.handleRequest(request("/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", storage: "connected" });
  });

  test("missing song files return a clean not-found response", async () => {
    const { app, songsDir } = storageApp();
    await rm(join(songsDir, "red-white-beige.m4a"));
    const response = await app.handleRequest(request(streamPath));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Track not found" });
  });
});

describe("routing and frontend boundary", () => {
  test("serves built files and page URLs, while rejecting API misses, missing assets and private paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "mangrove-api-"));
    cleanups.push(() => rm(root, { recursive: true, force: true }));
    const dist = join(root, "dist");
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(join(dist, "index.html"), "<html>room</html>");
    await writeFile(join(dist, "install.sh"), "#!/bin/sh\nprintf installed\n");
    await writeFile(join(dist, "assets", "app.js"), "console.log('room')");
    await writeFile(join(root, "secret.txt"), "private");
    await writeFile(join(dist, ".env"), "private");
    await writeFile(join(dist, "package.json"), "private");
    await symlink(join(root, "secret.txt"), join(dist, "leak.txt"));
    const app = createApp({ distDir: dist, storageLayer: makeStorageLayer({}) });
    cleanups.push(app.dispose);

    for (const path of ["/", "/collection/red-white-beige"]) {
      const response = await app.handleRequest(request(path, { headers: { Accept: "text/html" } }));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("<html>room</html>");
    }
    const installer = await app.handleRequest(request("/install.sh"));
    expect(installer.status).toBe(200);
    expect(installer.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await installer.text()).toStartWith("#!/bin/sh");
    const script = await app.handleRequest(request("/assets/app.js"));
    expect(script.status).toBe(200);
    expect(await script.text()).toBe("console.log('room')");
    const head = await app.handleRequest(request("/collection", { method: "HEAD" }));
    expect(head.status).toBe(200);
    expect(head.headers.get("Content-Length")).toBe("17");
    expect(head.body).toBeNull();

    for (const path of [
      "/api", "/api/unknown", "/api/tracks/other/stream", "/assets/missing.js", "/leak.txt",
      "/.env", "/%2eenv", "/package.json", "/src/room", "/src/main.tsx",
      "/assets/app.js.map", "/%2e%2e/secret.txt", "/assets%2f..%2f..%2fsecret.txt", "/foo%00bar",
    ]) expect((await app.handleRequest(request(path))).status).toBe(404);
    expect((await app.handleRequest(request("/missing", { headers: { Accept: "application/json" } }))).status).toBe(404);
    expect((await app.handleRequest(request("/%zz"))).status).toBe(400);
    const post = await app.handleRequest(request("/api/tracks", { method: "DELETE" }));
    expect(post.status).toBe(405);
    expect(post.headers.get("Allow")).toBe("GET, HEAD");
  });
});
