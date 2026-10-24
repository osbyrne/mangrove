import { resolve } from "node:path";
import { ensureTrack, importTrack, initializeStorage } from "./storage";

const source = Bun.argv[2];
if (!source) {
  console.error('Usage: bun run import:track "/path/to/RedWhiteBeige 2026-05-11.m4a"');
  process.exit(1);
}
const file = Bun.file(resolve(source));
if (!await file.exists() || file.size === 0) throw new Error("The source audio file is missing or empty.");
// ISO base media files identify their format with the ftyp box.
const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
if (new TextDecoder().decode(header.slice(4, 8)) !== "ftyp") throw new Error("Expected an M4A/MP4 audio file.");
await initializeStorage();
await importTrack(resolve(source));
await ensureTrack();
console.log(`Imported ${file.size.toLocaleString()} bytes into .data/songs.`);
