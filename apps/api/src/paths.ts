import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const standalone = Bun.isStandaloneExecutable;
export const projectRoot = standalone ? process.cwd() : resolve(import.meta.dir, "../../..");
export const dataDir = resolve(process.env.MANGROVE_DATA_DIR ?? resolve(projectRoot, ".data"));
export const defaultDistDir = standalone
  ? resolve(import.meta.dir, "dist")
  : fileURLToPath(new URL("../../web/dist", import.meta.url));
