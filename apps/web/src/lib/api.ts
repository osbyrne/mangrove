import { Effect, Schema } from 'effect'
import { HealthSchema, TracksSchema } from '@mangrove/shared'

export type { Track } from '@mangrove/shared'

class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function fetchJson(path: string, signal?: AbortSignal) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(path, { signal, headers: { Accept: 'application/json' } }),
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
          const stream = new URL(track.streamUrl, window.location.origin)
          const validDate = /^\d{4}-\d{2}-\d{2}$/.test(track.recordedAt)
            && Number.isFinite(Date.parse(`${track.recordedAt}T12:00:00Z`))
          if (stream.origin !== window.location.origin || !/^https?:$/.test(stream.protocol)
            || !validDate || ids.has(track.id) || !track.contentType.startsWith('audio/')) {
            throw new Error('Invalid track')
          }
          ids.add(track.id)
        }
        return payload
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
