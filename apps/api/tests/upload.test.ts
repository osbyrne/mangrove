import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app";
import { SongLibrary } from "../src/library";
import { makeStorageLayer } from "../src/storage";
import { createHttpServer } from "../src/http";
import { maxUploadBytes } from "../src/upload";
import { listenHost } from "../src/network";

const cleanups: Array<() => unknown | Promise<unknown>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
const wav = new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69,100,97,116,97]);

async function setup(failPut = false, allowedOrigins: readonly string[] = []) {
  const root = await mkdtemp(join(tmpdir(), "mangrove-library-test-"));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "catalog.sqlite");
  const library = new SongLibrary(path);
  cleanups.push(() => library.close());
  const objects = new Map<string, Uint8Array>();
  const s3 = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const key = new URL(request.url).pathname;
    if (key === "/music/" || key === "/music") return new Response(null);
    if (request.method === "PUT") {
      if (failPut) return new Response("private error", { status: 500 });
      objects.set(key, new Uint8Array(await request.arrayBuffer()));
      return new Response(null);
    }
    const body = objects.get(key);
    if (!body) return new Response(null, { status: 404 });
    return new Response(request.method === "HEAD" ? null : new Uint8Array(body).buffer, { headers: { "Content-Length": String(body.length) } });
  } });
  cleanups.push(() => s3.stop(true));
  const app = createApp({ library, allowedOrigins, storageLayer: makeStorageLayer({ endpoint: s3.url.origin, accessKeyId: "test", secretAccessKey: "test" }) });
  cleanups.push(app.dispose);
  const http = createHttpServer(app.handleRequest);
  await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
  cleanups.push(async () => { http.closeAllConnections(); await new Promise<void>(resolve => http.close(() => resolve())); });
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("No HTTP port");
  return { library, path, app, objects, origin: `http://127.0.0.1:${address.port}` };
}

test("an empty library is healthy; an HTTP upload persists in S3 and the catalog and streams back", async () => {
  const { origin, path, objects } = await setup();
  expect((await fetch(`${origin}/api/health`)).status).toBe(200);
  expect(await (await fetch(`${origin}/api/tracks`)).json()).toEqual({ tracks: [] });
  const response = await fetch(`${origin}/api/tracks?filename=My%20song.wav`, {
    method: "POST", headers: { Origin: origin }, body: wav,
  });
  expect(response.status).toBe(201);
  const { track } = await response.json() as { track: { id: string; title: string; streamUrl: string; objectKey?: string } };
  expect(track.title).toBe("My song");
  expect(track.objectKey).toBeUndefined();
  expect(objects.size).toBe(1);
  const reopened = new SongLibrary(path);
  try { expect(reopened.list()[0]?.id).toBe(track.id); } finally { reopened.close(); }
  const streamed = await fetch(`${origin}${track.streamUrl}`);
  expect(streamed.status).toBe(200);
  expect(new Uint8Array(await streamed.arrayBuffer())).toEqual(wav);
});

test("rejects cross-origin, oversized, empty, traversal and disguised uploads without publishing songs", async () => {
  const { origin, app, library, objects } = await setup();
  for (const [filename, body, headers, expected] of [
    ["song.wav", wav, { Origin: "https://untrusted.example" }, 403],
    ["song.wav", wav, { "Content-Length": String(maxUploadBytes + 1) }, 413],
    ["song.wav", new Uint8Array(), {}, 400],
    ["../song.wav", wav, {}, 400],
    ["song.exe", wav, {}, 415],
    ["song.wav", new TextEncoder().encode("not audio"), {}, 415],
  ] as const) {
    const response = await app.handleRequest(new Request(`${origin}/api/tracks?filename=${encodeURIComponent(filename)}`, { method: "POST", body, headers }));
    expect(response.status).toBe(expected);
  }
  expect(library.list()).toEqual([]);
  expect(objects.size).toBe(0);
});

test("a failed S3 write never publishes a catalog entry or leaks the storage error", async () => {
  const { origin, library } = await setup(true);
  const response = await fetch(`${origin}/api/tracks?filename=song.wav`, { method: "POST", body: wav });
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private error");
  expect(library.list()).toEqual([]);
});

test("listeners allow loopback and tailnet IPv4 addresses and reject public/all-interface binds", () => {
  expect(listenHost("100.86.196.40")).toBe("100.86.196.40");
  expect(listenHost("127.0.0.1")).toBe("127.0.0.1");
  for (const host of ["0.0.0.0", "192.168.1.2", "100.128.0.1", "100.64.256.1", "example.com"]) expect(() => listenHost(host)).toThrow();
});


test("only the configured frontend can preflight, upload and read the private API", async () => {
  const frontend = "https://mangrove.example";
  const { app, origin, library } = await setup(false, [frontend]);
  const preflight = await app.handleRequest(new Request(`${origin}/api/tracks`, {
    method: "OPTIONS", headers: { Origin: frontend, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type", "Access-Control-Request-Private-Network": "true" },
  }));
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(frontend);
  expect(preflight.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
  const upload = await app.handleRequest(new Request(`${origin}/api/tracks?filename=song.wav`, {
    method: "POST", headers: { Origin: frontend, "Sec-Fetch-Site": "cross-site" }, body: wav,
  }));
  expect(upload.status).toBe(201);
  expect(upload.headers.get("Access-Control-Allow-Origin")).toBe(frontend);
  const catalog = await app.handleRequest(new Request(`${origin}/api/tracks`, { headers: { Origin: frontend } }));
  expect(catalog.headers.get("Access-Control-Allow-Origin")).toBe(frontend);
  for (const untrusted of ["https://evil.example", "https://mangrove.example.evil.example"]) {
    const denied = await app.handleRequest(new Request(`${origin}/api/tracks?filename=bad.wav`, {
      method: "POST", headers: { Origin: untrusted, "Sec-Fetch-Site": "cross-site" }, body: wav,
    }));
    expect(denied.status).toBe(403);
    expect(denied.headers.has("Access-Control-Allow-Origin")).toBe(false);
  }
  expect(library.list()).toHaveLength(1);
  const deniedHeaders = await app.handleRequest(new Request(`${origin}/api/tracks`, {
    method: "OPTIONS", headers: { Origin: frontend, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization" },
  }));
  expect(deniedHeaders.status).toBe(403);
});
