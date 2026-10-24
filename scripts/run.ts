import { listenHost } from "../apps/api/src/network";
import { startServer } from "./server";
import { projectRoot, dataDir, initializeStorage, registerLegacyTrack } from "./storage";

const mode = Bun.argv[2] ?? "dev";
if (mode !== "dev" && mode !== "start") throw new Error("Use dev or start.");
if (mode === "dev" && process.env.MANGROVE_API_URL) {
  const child = Bun.spawn([process.execPath, "run", "--filter", "@mangrove/web", "dev"], { cwd: projectRoot, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.exit(await child.exited);
}
if (mode === "start") {
  await startServer();
} else {
  const host = listenHost();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) throw new Error("Invalid PORT.");
  if (port !== 3000) throw new Error("Development uses PORT=3000 for the Vite API proxy. Use bun start for a custom port.");
  // Refuse existing listeners; never reuse or stop somebody else's API or frontend server.
  for (const p of [port, 5173]) {
    const probe = Bun.listen({ hostname: p === port ? host : "127.0.0.1", port: p, socket: { data() {} } });
    probe.stop(true);
  }
  const children: ReturnType<typeof Bun.spawn>[] = [];
  let stopping = false;
  async function stop(code: number) {
    if (stopping) return;
    stopping = true;
    for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
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
  await initializeStorage();
  await registerLegacyTrack();
  spawn([process.execPath, "--watch", "apps/api/src/index.ts"]);
  spawn([process.execPath, "run", "--filter", "@mangrove/web", "dev"]);
  console.log(`\nMangrove → http://127.0.0.1:5173\nSongs → ${dataDir}/songs\n`);
  await new Promise(() => {});
}
