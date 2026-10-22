import { Schema } from "effect";

// Public wire contracts only. Keep storage keys, credentials, and platform code in the API.
export const TrackSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  artist: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  filename: Schema.NonEmptyString,
  contentType: Schema.NonEmptyString,
  streamUrl: Schema.NonEmptyString,
});
export const TracksSchema = Schema.Struct({ tracks: Schema.Array(TrackSchema) });
export const HealthSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  storage: Schema.Literal("connected"),
});

export type Track = typeof TrackSchema.Type;
export type TracksResponse = typeof TracksSchema.Type;
export type HealthResponse = typeof HealthSchema.Type;
