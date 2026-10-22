import { randomBytes } from "node:crypto";
import { chmod, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export const projectRoot = resolve(import.meta.dir, "..");
export const dataDir = resolve(projectRoot, ".data");
export const configPath = resolve(dataDir, "rclone.conf");
const credentialsPath = resolve(dataDir, "s3.json");
export const objectPath = "vault:music/red-white-beige.m4a";

export async function rclone(args: string[]) {
  const child = Bun.spawn(["rclone", "--config", configPath, ...args], {
    env: { ...process.env, RCLONE_CONFIG_VAULT_REMOTE: resolve(dataDir, "objects") },
    stdout: "pipe", stderr: "pipe",
  });
  const [output, error, status] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  if (status !== 0) throw new Error(`rclone ${args[0]} failed: ${error.trim()}`);
  return output;
}

async function obscure() {
  const child = Bun.spawn(["rclone", "obscure", "-"], {
    stdin: new Blob([randomBytes(48).toString("base64url")]), stdout: "pipe", stderr: "pipe",
  });
  const output = await new Response(child.stdout).text();
  if (await child.exited !== 0) throw new Error("Could not generate rclone encryption configuration.");
  return output.trim();
}

export async function initializeStorage() {
  if (!Bun.which("rclone")) throw new Error("Install rclone first: brew install rclone (macOS), or https://rclone.org/install/");
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await chmod(dataDir, 0o700);
  await mkdir(resolve(dataDir, "objects"), { recursive: true, mode: 0o700 });
  if (!await Bun.file(configPath).exists()) {
    // Never silently replace an encryption key when a vault already exists.
    const existing = [...new Bun.Glob("**/*").scanSync({ cwd: resolve(dataDir, "objects"), onlyFiles: true })];
    if (existing.length) throw new Error("The vault has objects but rclone.conf is missing. Restore its original encryption key from backup.");
    const password = await obscure();
    const salt = await obscure();
    await Bun.write(configPath, `[vault]\ntype = crypt\nremote = ${resolve(dataDir, "objects")}\nfilename_encryption = standard\ndirectory_name_encryption = true\npassword = ${password}\npassword2 = ${salt}\n`, { mode: 0o600 });
  }
  await chmod(configPath, 0o600);
  if (!await Bun.file(credentialsPath).exists()) {
    await Bun.write(credentialsPath, JSON.stringify({
      accessKeyId: randomBytes(16).toString("hex"),
      secretAccessKey: randomBytes(32).toString("hex"),
    }), { mode: 0o600 });
  }
  await chmod(credentialsPath, 0o600);
  const credentials = await Bun.file(credentialsPath).json() as { accessKeyId: string; secretAccessKey: string };
  if (!credentials.accessKeyId || !credentials.secretAccessKey) throw new Error("Invalid local S3 credentials in .data/s3.json.");
  return credentials;
}

export async function ensureTrack() {
  try { await rclone(["lsjson", "--stat", objectPath]); }
  catch { throw new Error('Import your song first: bun run import:track "/path/to/RedWhiteBeige 2026-05-11.m4a"'); }
}
