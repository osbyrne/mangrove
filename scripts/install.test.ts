import { afterEach, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
const installer = resolve(import.meta.dir, "../apps/web/public/install.sh");
const payload = "#!/bin/sh\nprintf '0.1.0\\n'\n";

async function fixture(options: { missingRclone?: boolean; checksumFailure?: boolean; downloadFailure?: boolean; arch?: "x64" | "arm64"; legacyArchive?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), "mangrove-installer-test-"));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const tools = join(root, "tools");
  const bin = join(root, "install with spaces");
  await mkdir(tools);
  const arch = options.arch ?? "x64";
  const name = `mangrove-v0.1.0-linux-${arch}`;
  await mkdir(join(root, name));
  await writeFile(join(root, name, options.legacyArchive ? "mangrove-server" : "mangrove"), payload);
  const tar = Bun.spawn(["tar", "-czf", join(root, "server.tar.gz"), "-C", root, name]);
  expect(await tar.exited).toBe(0);
  const sha = new Bun.CryptoHasher("sha256").update(await Bun.file(join(root, "server.tar.gz")).arrayBuffer()).digest("hex");
  await writeFile(join(root, "SHA256SUMS.txt"), `${options.checksumFailure ? "0".repeat(64) : sha}  ./${name}.tar.gz\n`);
  for (const command of ["tar", "gzip", "awk", "mktemp", "cp", "chmod", "mv", "mkdir", "grep", "rm", "shasum", "unzip"]) {
    const path = Bun.which(command);
    if (!path) throw new Error(`Missing installer test tool: ${command}`);
    await symlink(path, join(tools, command));
  }
  async function script(name: string, contents: string) {
    const path = join(tools, name);
    await writeFile(path, `#!/bin/sh\n${contents}\n`);
    await chmod(path, 0o755);
  }
  await script("uname", 'case "$1" in -s) printf "%s\\n" "${TEST_OS:-Linux}" ;; -m) printf "%s\\n" "$TEST_ARCH" ;; esac');
  if (!options.missingRclone) await script("rclone", 'printf "rclone v1.75.2\\n"');
  else {
    const directory = `rclone-v1.75.2-linux-${arch === "x64" ? "amd64" : "arm64"}`;
    await mkdir(join(root, directory));
    await writeFile(join(root, directory, "rclone"), "#!/bin/sh\nprintf 'rclone v1.75.2\\n'\n");
    const zip = Bun.spawn(["zip", "-q", join(root, "rclone.zip"), `${directory}/rclone`], { cwd: root });
    expect(await zip.exited).toBe(0);
    const hash = new Bun.CryptoHasher("sha256").update(await Bun.file(join(root, "rclone.zip")).arrayBuffer()).digest("hex");
    await writeFile(join(root, "rclone-checksums.txt"), `${hash}  ${directory}.zip\n`);
  }
  await script("curl", `
[ "\${TEST_DOWNLOAD_FAILURE:-}" != yes ] || exit 22
url=; output=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output) output=$2; shift 2 ;;
    https://*) url=$1; shift ;;
    *) shift ;;
  esac
done
case "$url" in
  */releases/latest) printf 'https://github.com/osbyrne/mangrove/releases/tag/v0.1.0' ;;
  https://github.com/*/SHA256SUMS.txt) cp "$TEST_FIXTURE/SHA256SUMS.txt" "$output" ;;
  https://github.com/*/*.tar.gz) cp "$TEST_FIXTURE/server.tar.gz" "$output" ;;
  https://downloads.rclone.org/*/SHA256SUMS) cp "$TEST_FIXTURE/rclone-checksums.txt" "$output" ;;
  https://downloads.rclone.org/*/*.zip) cp "$TEST_FIXTURE/rclone.zip" "$output" ;;
  *) exit 22 ;;
esac`);
  const run = async (args: string[] = [], overrides: Record<string, string> = {}) => {
    const child = Bun.spawn(["/bin/sh", installer, ...args], { env: {
      PATH: tools, HOME: root, TMPDIR: root, MANGROVE_INSTALL_DIR: bin, TEST_FIXTURE: root,
      TEST_ARCH: arch === "x64" ? "x86_64" : "aarch64", TEST_DOWNLOAD_FAILURE: options.downloadFailure ? "yes" : "", ...overrides,
    }, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    return { stdout, stderr, code };
  };
  return { root, bin, run };
}

test.each(["x64", "arm64"] as const)("installs the latest %s release into a directory with spaces", async arch => {
  const { bin, run } = await fixture({ arch });
  const result = await run();
  expect(result.code).toBe(0);
  expect(await Bun.file(join(bin, "mangrove")).text()).toBe(payload);
  expect(await Bun.file(join(bin, "rclone")).exists()).toBe(false);
});
test("installs a checksummed rclone dependency when missing and accepts a pinned version", async () => {
  const { bin, run } = await fixture({ missingRclone: true });
  expect((await run(["--version", "0.1.0"])).code).toBe(0);
  expect(await Bun.file(join(bin, "rclone")).text()).toContain("rclone v1.75.2");
});
test("a checksum failure preserves an existing installation", async () => {
  const { bin, run } = await fixture({ checksumFailure: true });
  await mkdir(bin); await writeFile(join(bin, "mangrove"), "previous executable");
  const result = await run();
  expect(result.code).not.toBe(0);
  expect(result.stderr).toContain("Checksum mismatch");
  expect(await Bun.file(join(bin, "mangrove")).text()).toBe("previous executable");
});
test("failed downloads never create an installation", async () => {
  const { bin, run } = await fixture({ downloadFailure: true });
  expect((await run(["--version", "v0.1.0"])).code).not.toBe(0);
  expect(await Bun.file(join(bin, "mangrove")).exists()).toBe(false);
});
test("rejects unsupported systems and unsafe version overrides", async () => {
  const { run } = await fixture();
  expect((await run([], { TEST_OS: "Darwin" })).stderr).toContain("Linux only");
  expect((await run([], { TEST_ARCH: "riscv64" })).code).not.toBe(0);
  for (const version of ["../../bad", "0.1.0\nmalicious"]) expect((await run(["--version", version])).code).not.toBe(0);
});

test("legacy release archives are installed under the mangrove command", async () => {
  const { bin, run } = await fixture({ legacyArchive: true });
  expect((await run(["--version", "v0.1.0"])).code).toBe(0);
  expect(await Bun.file(join(bin, "mangrove")).text()).toBe(payload);
  expect(await Bun.file(join(bin, "mangrove-server")).exists()).toBe(false);
});
