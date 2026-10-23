import { Effect, Schema } from 'effect'
import { HealthSchema, TracksSchema } from '@mangrove/shared'

export type { Track } from '@mangrove/shared'

const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim()
const apiOrigin = configuredOrigin ? new URL(configuredOrigin) : undefined
if (apiOrigin && (apiOrigin.protocol !== 'https:' || apiOrigin.username || apiOrigin.password
  || apiOrigin.pathname !== '/' || apiOrigin.search || apiOrigin.hash)) {
  throw new Error('VITE_API_ORIGIN must be an HTTPS origin')
}
const apiBase = apiOrigin?.origin ?? window.location.origin
const apiUrl = (path: string) => new URL(path, apiBase).href

class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function fetchJson(path: string, signal?: AbortSignal) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(apiUrl(path), { signal, headers: { Accept: 'application/json' } }),
      catch: () => new ApiError('We couldn’t reach your collection. Check your connection and try again.'),
    })
    if (!response.ok) {
      return yield* Effect.fail(new ApiError(
        response.status === 503
          ? 'Your collection is temporarily unavailable. Please try again in a moment.'
          : 'Your collection couldn’t be loaded. Please try again.',
      ))
    }
    return yield* Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: () => new ApiError('We received an unreadable response. Please try again.'),
    })
  })
}

// Keep transport, decoding, and semantic validation in one typed Effect program.
function tracksProgram(signal?: AbortSignal) {
  return Effect.gen(function* () {
    const json = yield* fetchJson('/api/tracks', signal)
    const payload = yield* Schema.decodeUnknownEffect(TracksSchema)(json).pipe(
      Effect.mapError(() => new ApiError('The collection response was incomplete. Please try again.')),
    )
    return yield* Effect.try({
      try: () => {
        const ids = new Set<string>()
        for (const track of payload.tracks) {
          const stream = new URL(track.streamUrl, apiBase)
          const validDate = /^\d{4}-\d{2}-\d{2}$/.test(track.recordedAt)
            && Number.isFinite(Date.parse(`${track.recordedAt}T12:00:00Z`))
          if (stream.origin !== apiBase || !/^https?:$/.test(stream.protocol)
            || !validDate || ids.has(track.id) || !track.contentType.startsWith('audio/')) {
            throw new Error('Invalid track')
          }
          ids.add(track.id)
        }
        return { tracks: payload.tracks.map(track => ({ ...track, streamUrl: apiUrl(track.streamUrl) })) }
      },
      catch: () => new ApiError('Some recording details could not be verified. Please try again.'),
    })
  })
}

async function runApi<A>(program: Effect.Effect<A, ApiError>): Promise<A> {
  const result = await Effect.runPromise(program.pipe(Effect.match({
    onFailure: (error) => ({ ok: false as const, error }),
    onSuccess: (value) => ({ ok: true as const, value }),
  })))
  if (!result.ok) throw result.error
  return result.value
}

export const getTracks = (signal?: AbortSignal) => runApi(tracksProgram(signal))
export const getHealth = (signal?: AbortSignal) => runApi(Effect.gen(function* () {
  const json = yield* fetchJson('/api/health', signal)
  return yield* Schema.decodeUnknownEffect(HealthSchema)(json).pipe(
    Effect.mapError(() => new ApiError('The connection to your collection could not be verified.')),
  )
}))


export async function uploadSong(file: File, signal?: AbortSignal) {
  const response = await fetch(apiUrl(`/api/tracks?filename=${encodeURIComponent(file.name)}`), {
    method: 'POST', body: file, signal,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  const payload = await response.json() as { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? 'Upload failed. Please try again.')
}
