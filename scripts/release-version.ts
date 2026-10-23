import { appendFile } from "node:fs/promises";

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;
export function releaseVersion(version: unknown, previous?: unknown) {
  if (typeof version !== "string" || (!semver.test(version) || version.trim() !== version)) throw new Error("package.json version must be SemVer (without build metadata)");
  if (typeof previous === "string" && version !== previous && Bun.semver.order(version, previous) <= 0) throw new Error("The release version must increase");
  return { changed: version !== previous, version, tag: `v${version}`, prerelease: version.includes("-") };
}

if (import.meta.main) {
  const event = await Bun.file(process.env.GITHUB_EVENT_PATH!).json() as { before?: string };
  const current = await Bun.file("package.json").json() as { version: unknown };
  let previous: unknown;
  if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" && event.before && !/^0+$/.test(event.before)) {
    const command = Bun.spawn(["git", "show", `${event.before}:package.json`], { stdout: "pipe", stderr: "inherit" });
    const text = await new Response(command.stdout).text();
    if (await command.exited !== 0) throw new Error("Cannot read the previous package version");
    previous = (JSON.parse(text) as { version?: unknown }).version;
  }
  const result = releaseVersion(current.version, previous);
  console.log(result.changed ? `Release ${result.tag}` : "Version unchanged; no release");
  await appendFile(process.env.GITHUB_OUTPUT!, Object.entries(result).map(([key, value]) => `${key}=${value}\n`).join(""));
}
