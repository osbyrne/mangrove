import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedRoot = fileURLToPath(new URL("../../packages/shared", import.meta.url));
const dependencies = fileURLToPath(new URL("../../node_modules", import.meta.url));

export default defineConfig({
  root: webRoot,
  plugins: [solid(), {
    name: "private-workspace-paths",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let path: string;
        try { path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname); }
        catch { response.writeHead(400).end(); return; }
        // Reject private URLs before Vite's SPA fallback, even when no file exists in web.
        if (/(^|\/)(?:\.data|\.git|\.env(?:\.[^/]*)?|scripts|tests|server)(\/|$)/.test(path)
          || /\/(?:apps|node_modules\/@mangrove)\/api(\/|$)/.test(path)) {
          response.writeHead(404, { "Cache-Control": "no-store" }).end();
          return;
        }
        next();
      });
    },
  }],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3000" },
    fs: {
      // Explicit allowlist avoids Vite granting access to the whole workspace root.
      allow: [webRoot, sharedRoot, dependencies],
      deny: ["**/.env", "**/.env.*", "**/*.{crt,pem}", "**/.git/**", "**/.data/**", "**/apps/api/**", "**/node_modules/@mangrove/api/**", "**/server/**", "**/scripts/**", "**/tests/**"],
    },
  },
});
