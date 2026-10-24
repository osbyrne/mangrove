import { chmod, copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { projectRoot, dataDir } from "../apps/api/src/paths";
import { SongLibrary } from "../apps/api/src/library";
import { track } from "../apps/api/src/catalog";

export { projectRoot, dataDir };

const songsDir = join(dataDir, "songs");
const samplePath = join(songsDir, track.objectKey.slice("songs/".length));

export async function initializeStorage() {
  await mkdir(songsDir, { recursive: true, mode: 0o700 });
  await chmod(dataDir, 0o700);
  await chmod(songsDir, 0o700);
}

export async function ensureTrack() {
  if (!await Bun.file(samplePath).exists()) {
    throw new Error('Import your song first: bun run import:track "/path/to/RedWhiteBeige 2026-05-11.m4a"');
  }
}

export async function importTrack(path: string) {
  await initializeStorage();
  await copyFile(path, samplePath);
  await chmod(samplePath, 0o600);
}

export async function registerLegacyTrack() {
  const library = new SongLibrary();
  try {
    if (library.find(track.id) || !await Bun.file(samplePath).exists()) return;
    library.add({ ...track, streamUrl: `/api/tracks/${track.id}/stream` });
  } finally {
    library.close();
  }
}
