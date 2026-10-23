import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRoot } from "../apps/api/src/paths";

const target = Bun.argv[2] ?? `bun-${process.platform}-${process.arch}`;
const targets = ["bun-linux-x64", "bun-linux-arm64", "bun-darwin-arm64", "bun-darwin-x64"] as const;
if (!targets.includes(target as typeof targets[number])) throw new Error(`Unsupported server target: ${target}`);
const outfile = resolve(projectRoot, "dist/mangrove");
await mkdir(resolve(projectRoot, "dist"), { recursive: true });
const result = await Bun.build({
  entrypoints: [resolve(projectRoot, "scripts/server.ts")],
  compile: { target: target as typeof targets[number], outfile, assets: [resolve(projectRoot, "apps/web/dist")], autoloadDotenv: false, autoloadBunfig: false },
  minify: true,
});
if (!result.success) throw new AggregateError(result.logs, "Server compilation failed");
console.log(`Built ${outfile} (${target})`);
