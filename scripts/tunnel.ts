import { resolve } from "node:path";
import { projectRoot } from "./storage";

const config = resolve(Bun.argv[2] ?? `${projectRoot}/.data/cloudflared.yml`);
if (!Bun.which("cloudflared")) throw new Error("Install cloudflared, then follow deploy/README.md to configure your domain and VPN-only host.");
if (!await Bun.file(config).exists()) throw new Error("Create .data/cloudflared.yml using deploy/cloudflared.example.yml and deploy/README.md.");
const health = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/health`).catch(() => null);
if (!health?.ok) throw new Error("Start the production stack with bun run build && bun start before opening the tunnel.");
const processHandle = Bun.spawn(["cloudflared", "tunnel", "--config", config, "run"], {
  stdout: "inherit", stderr: "inherit",
});
process.on("SIGINT", () => processHandle.kill("SIGINT"));
process.on("SIGTERM", () => processHandle.kill("SIGTERM"));
process.exit(await processHandle.exited);
