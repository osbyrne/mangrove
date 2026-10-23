import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import stylex from "@stylexjs/unplugin";
import { fileURLToPath } from "node:url";

const apiTarget = process.env.MANGROVE_API_URL ?? "http://127.0.0.1:3000";
const apiOrigin = new URL(apiTarget);
if (!/^https?:$/.test(apiOrigin.protocol) || apiOrigin.username || apiOrigin.password || apiOrigin.pathname !== "/" || apiOrigin.search || apiOrigin.hash) {
  throw new Error("MANGROVE_API_URL must be an HTTP(S) origin");
}

const browserApiOrigin = process.env.VITE_API_ORIGIN?.trim();
if (browserApiOrigin) {
  const url = new URL(browserApiOrigin);
  if (url.protocol !== "https:" || url.origin !== browserApiOrigin) {
    throw new Error("VITE_API_ORIGIN must be an exact HTTPS origin");
  }
}

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedRoot = fileURLToPath(
  new URL("../../packages/shared", import.meta.url),
);
const dependencies = fileURLToPath(
  new URL("../../node_modules", import.meta.url),
);

export default defineConfig({
  root: webRoot,
  plugins: [
    stylex.vite({
      dev: process.env.NODE_ENV !== "production",
      runtimeInjection: false,
      useCSSLayers: true,
      unstable_moduleResolution: { type: "commonJS", rootDir: webRoot },
    }),
    solid(),
    {
      name: "stylex-production-stylesheet",
      apply: "build",
      // With no authored CSS entry, the official plugin writes this generated asset.
      transformIndexHtml() {
        return [
          {
            tag: "link",
            attrs: { rel: "stylesheet", href: "/assets/stylex.css" },
            injectTo: "head",
          },
        ];
      },
    },
    {
      name: "private-workspace-paths",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          let path: string;
          try {
            path = decodeURIComponent(
              new URL(request.url ?? "/", "http://localhost").pathname,
            );
          } catch {
            response.writeHead(400).end();
            return;
          }
          // Reject private URLs before Vite's SPA fallback, even when no file exists in web.
          if (
            /(^|\/)(?:\.data|\.git|\.env(?:\.[^/]*)?|scripts|tests|server)(\/|$)/.test(
              path,
            ) ||
            /\/(?:apps|node_modules\/@mangrove)\/api(\/|$)/.test(path)
          ) {
            response.writeHead(404, { "Cache-Control": "no-store" }).end();
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": {
      target: apiTarget,
      changeOrigin: true,
      configure(proxy) {
        proxy.on("proxyReq", (proxyRequest, request) => {
          // Forward same-origin uploads through the server-side dev proxy.
          const origin = request.headers.origin;
          if (origin && new URL(origin).host === request.headers.host) {
            proxyRequest.setHeader("Origin", apiOrigin.origin);
          }
        });
      },
    } },
    fs: {
      // Explicit allowlist avoids Vite granting access to the whole workspace root.
      allow: [webRoot, sharedRoot, dependencies],
      deny: [
        "**/.env",
        "**/.env.*",
        "**/*.{crt,pem}",
        "**/.git/**",
        "**/.data/**",
        "**/apps/api/**",
        "**/node_modules/@mangrove/api/**",
        "**/server/**",
        "**/scripts/**",
        "**/tests/**",
      ],
    },
  },
});
