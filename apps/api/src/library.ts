import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { dataDir } from "./paths";
import type { Track } from "@mangrove/shared";

export type StoredTrack = Track & { objectKey: string };

/** Only song metadata lives here; audio files live in the private local songs directory. */
export class SongLibrary {
  private readonly db: Database;
  constructor(path = resolve(dataDir, "catalog.sqlite")) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path, { create: true });
    this.db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, data TEXT NOT NULL)");
  }
  list(): Track[] {
    return (this.db.query("SELECT data FROM tracks ORDER BY rowid").all() as { data: string }[])
      .map(({ data }) => { const { objectKey, ...track } = JSON.parse(data) as StoredTrack; return track; });
  }
  find(id: string): StoredTrack | undefined {
    const row = this.db.query("SELECT data FROM tracks WHERE id = ?").get(id) as { data: string } | null;
    return row ? JSON.parse(row.data) as StoredTrack : undefined;
  }
  add(track: StoredTrack) {
    this.db.query("INSERT INTO tracks (id, data) VALUES (?, ?)").run(track.id, JSON.stringify(track));
  }
  close() { this.db.close(); }
}
