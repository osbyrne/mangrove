import type { TracksResponse } from "@mangrove/shared";

export const track = {
  id: "red-white-beige",
  title: "Red White Beige",
  artist: "Private collection",
  recordedAt: "2026-05-11",
  filename: "RedWhiteBeige 2026-05-11.m4a",
  objectKey: "red-white-beige.m4a",
  contentType: "audio/mp4",
} as const;

export const catalog = {
  tracks: [{
    id: track.id,
    title: track.title,
    artist: track.artist,
    recordedAt: track.recordedAt,
    filename: track.filename,
    contentType: track.contentType,
    streamUrl: `/api/tracks/${track.id}/stream`,
  }],
} satisfies TracksResponse;
