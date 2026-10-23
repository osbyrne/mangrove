import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { createApp as makeApp } from "../src/app";
import { SongLibrary } from "../src/library";
import { track } from "../src/catalog";
function createApp(options: Parameters<typeof makeApp>[0] = {}) {
  const library = new SongLibrary(":memory:");
  library.add({ ...track, streamUrl: `/api/tracks/${track.id}/stream` });
  cleanups.push(() => library.close());
  return makeApp({ ...options, library });
}
import { createHttpServer } from "../src/http";
import { createStorageClient, makeStorageLayer } from "../src/storage";

const cleanups: Array<() => unknown | Promise<unknown>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const streamPath = "/api/tracks/red-white-beige/stream";
const request = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init);
const payload = "0123456789";

async function listen(server: Server): Promise<string> {
  cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { server.removeListener("error", reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected loopback server");
  return `http://127.0.0.1:${address.port}`;
}

function storageApp(options: { status?: number; ignoreRange?: boolean; invalidLength?: boolean; rcloneRange?: boolean } = {}) {
  const requests: Array<{ url: string; method: string }> = [];
  const s3 = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      requests.push({ url: req.url, method: req.method });
      if (options.status) return new Response(req.method === "HEAD" ? null : "upstream secret details", {
        status: options.status,
      });
      const range = req.headers.get("Range");
      const match = range && !options.ignoreRange ? /^bytes=(\d+)-(\d+)$/.exec(range) : null;
      const body = match ? payload.slice(Number(match[1]), Number(match[2]) + 1) : payload;
      return new Response(req.method === "HEAD" ? null : body, {
        status: match && !options.rcloneRange ? 206 : 200,
        headers: {
          "Content-Length": options.invalidLength ? "9007199254740992" : String(body.length),
          ...(match ? { "Content-Range": `bytes ${match[1]}-${match[2]}/${payload.length}` } : {}),
        },
      });
    },
  });
  cleanups.push(() => s3.stop(true));
  const app = createApp({ storageLayer: makeStorageLayer({
    endpoint: s3.url.origin,
    accessKeyId: "unit-test-access",
    secretAccessKey: "unit-test-secret",
  }) });
  cleanups.push(app.dispose);
  return { app, requests, s3 };
}

describe("track streaming through the signed storage adapter", () => {
  test("full GET is signed server-side and returns only the audio response", async () => {
    const { app, requests } = storageApp();
    const response = await app.handleRequest(request(streamPath));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mp4");
    expect(response.headers.get("Content-Length")).toBe("10");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.has("Content-Range")).toBe(false);
    expect(await response.text()).toBe(payload);
    expect(requests.map((req) => req.method)).toEqual(["HEAD", "GET"]);
    for (const req of requests) {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/music/red-white-beige.m4a");
      expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
      expect(url.searchParams.get("X-Amz-Credential")).toStartWith("unit-test-access/");
    }
    expect(JSON.stringify([...response.headers])).not.toContain("unit-test");
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
    "rejects %s without downloading the object", async (range) => {
      const { app, requests } = storageApp();
      const response = await app.handleRequest(request(streamPath, { headers: { Range: range } }));
      expect(response.status).toBe(416);
      expect(response.headers.get("Content-Range")).toBe("bytes */10");
      expect(response.headers.get("Content-Length")).toBe("0");
      expect(await response.text()).toBe("");
      expect(requests.map((req) => req.method)).toEqual(["HEAD"]);
    },
  );

  test.each([null, "bytes=2-5", "bytes=-2", "bytes=50-"])("HEAD %s returns headers without audio", async (range) => {
    const { app, requests } = storageApp();
    const response = await app.handleRequest(request(streamPath, {
      method: "HEAD", headers: range ? { Range: range } : {},
    }));
    expect(response.status).toBe(range === null ? 200 : range === "bytes=50-" ? 416 : 206);
    expect(response.headers.get("Content-Length")).toBe(
      range === null ? "10" : range === "bytes=50-" ? "0" : range === "bytes=-2" ? "2" : "4",
    );
    expect(response.body).toBeNull();
    expect(await response.text()).toBe("");
    expect(requests.map((req) => req.method)).toEqual(["HEAD"]);
  });

  test("does not pass off an ignored upstream range as a partial response", async () => {
    const { app } = storageApp({ ignoreRange: true });
    const response = await app.handleRequest(request(streamPath, { headers: { Range: "bytes=2-5" } }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Storage unavailable" });
  });

  test("rclone's 200 with exact range metadata becomes a public 206 on the wire", async () => {
    const { app } = storageApp({ rcloneRange: true });
    const origin = await listen(createHttpServer(app.handleRequest));
    const response = await fetch(`${origin}${streamPath}`, { headers: { Range: "bytes=2-5" } });
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(response.headers.has("Transfer-Encoding")).toBe(false);
    expect(await response.text()).toBe("2345");
  });

  test.each([[404, 404], [403, 503], [500, 503]])("maps storage %i to clean HTTP %i", async (upstream, expected) => {
    const { app } = storageApp({ status: upstream });
    const response = await app.handleRequest(request(streamPath));
    expect(response.status).toBe(expected);
    expect(await response.json()).toEqual({ error: expected === 404 ? "Track not found" : "Storage unavailable" });
    const health = await app.handleRequest(request("/api/health"));
    expect(health.status).toBe(503);
    expect(await health.json()).toEqual({ status: "error", storage: "unavailable" });
  });

  test("health checks the bucket and streaming requires usable object metadata", async () => {
    const { app } = storageApp();
    const response = await app.handleRequest(request("/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", storage: "connected" });
    const invalid = storageApp({ invalidLength: true });
    expect((await invalid.app.handleRequest(request(streamPath))).status).toBe(503);
  });

  test("network failures stay clean and catalog remains available without credentials", async () => {
    const { app, s3 } = storageApp();
    await s3.stop(true);
    const offline = await app.handleRequest(request(streamPath));
    expect(offline.status).toBe(503);
    expect(await offline.json()).toEqual({ error: "Storage unavailable" });

    const noCredentials = createApp({ storageLayer: makeStorageLayer({}) });
    cleanups.push(noCredentials.dispose);
    const catalog = await noCredentials.handleRequest(request("/api/tracks"));
    expect(await catalog.json()).toEqual({ tracks: [{
      id: "red-white-beige", title: "Red White Beige", artist: "Private collection",
      recordedAt: "2026-05-11", filename: "RedWhiteBeige 2026-05-11.m4a",
      contentType: "audio/mp4", streamUrl: streamPath,
    }] });
    expect((await noCredentials.handleRequest(request(streamPath))).status).toBe(503);
    const head = await noCredentials.handleRequest(request(streamPath, { method: "HEAD" }));
    expect(head.status).toBe(503);
    expect(head.body).toBeNull();
  });

  test("delivers bytes before the upstream finishes and cancels storage on request abort", async () => {
    const cancelled = Promise.withResolvers<void>();
    const endpoint = await listen(createServer((req, res) => {
      res.writeHead(200, { "Content-Length": "10" });
      if (req.method === "HEAD") { res.end(); return; }
      res.once("close", () => cancelled.resolve());
      res.write("012");
      // Keep the object unfinished to prove streaming and disconnect propagation.
    }));
    const app = createApp({ storageLayer: makeStorageLayer({
      endpoint, accessKeyId: "unit-test-access", secretAccessKey: "unit-test-secret",
    }) });
    cleanups.push(app.dispose);
    const origin = await listen(createHttpServer(app.handleRequest));
    const abort = new AbortController();
    cleanups.push(() => abort.abort());
    const response = await fetch(`${origin}${streamPath}`, { signal: abort.signal });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("10");
    expect(response.headers.has("Transfer-Encoding")).toBe(false);
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    expect(new TextDecoder().decode(first.value)).toBe("012");
    abort.abort();
    await expect(reader.read()).rejects.toThrow();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        cancelled.promise,
        new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error("Upstream was not cancelled")), 1000); }),
      ]);
    } finally {
      clearTimeout(deadline);
    }
  });
});

describe("routing and frontend boundary", () => {
  test("serves built files and page URLs, while rejecting API misses, missing assets and private paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "mangrove-server-"));
    cleanups.push(() => rm(root, { recursive: true, force: true }));
    const dist = join(root, "dist");
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(join(dist, "index.html"), "<html>room</html>");
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


describe("local storage boundary", () => {
  test.each([
    "https://s3.amazonaws.com", "http://example.com", "http://127.0.0.1.example.com",
    "http://localhost:9091", "http://127.0.0.1:9091/remote", "http://user:secret@127.0.0.1:9091",
  ])("rejects a non-loopback origin: %s", (endpoint) => {
    expect(() => createStorageClient({ endpoint, accessKeyId: "local", secretAccessKey: "local" })).toThrow();
  });
});
