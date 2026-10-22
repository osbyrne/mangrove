import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'
import { createQuery } from '@tanstack/solid-query'
import { Link } from '@tanstack/solid-router'
import { ArrowRight, CircleAlert, Headphones, Library, LoaderCircle, Pause, Play, RefreshCw, Repeat1, Volume2, VolumeX } from 'lucide-solid'
import { Artwork, BotanicalMark } from './components/Artwork'
import { getHealth, getTracks } from './lib/api'
import type { Track } from './lib/api'

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function recordedDate(value: string, short = false) {
  return new Intl.DateTimeFormat('en', { month: short ? 'short' : 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export function ListeningRoom() {
  const tracks = createQuery(() => ({ queryKey: ['tracks'], queryFn: ({ signal }) => getTracks(signal) }))
  const health = createQuery(() => ({ queryKey: ['health'], queryFn: ({ signal }) => getHealth(signal), refetchInterval: 60_000 }))
  const [selectedId, setSelectedId] = createSignal<string>()
  const activeTrack = () => tracks.data?.tracks.find((track) => track.id === selectedId()) ?? tracks.data?.tracks[0]
  const [playing, setPlaying] = createSignal(false)
  const [starting, setStarting] = createSignal(false)
  const [waiting, setWaiting] = createSignal(false)
  const [duration, setDuration] = createSignal(0)
  const [elapsed, setElapsed] = createSignal(0)
  const [volume, setVolume] = createSignal(0.8)
  const [muted, setMuted] = createSignal(false)
  const [repeat, setRepeat] = createSignal(false)
  const [mediaError, setMediaError] = createSignal('')
  let audio: HTMLAudioElement | undefined
  let playRequest = 0

  const updateDuration = () => {
    setDuration(audio && Number.isFinite(audio.duration) ? audio.duration : 0)
  }

  createEffect(() => {
    activeTrack()?.id
    playRequest++
    setPlaying(false)
    setStarting(false)
    setWaiting(false)
    setDuration(0)
    setElapsed(0)
    setMediaError('')
  })
  onCleanup(() => { playRequest++; audio?.pause() })

  async function play() {
    const element = audio
    if (!element || !activeTrack()) return
    const request = ++playRequest
    setMediaError('')
    setStarting(true)
    try {
      if (element.error) element.load()
      await element.play()
    } catch (error) {
      if (request !== playRequest) return
      setPlaying(false)
      setWaiting(false)
      setMediaError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Your browser paused this request. Press play to start listening.'
        : 'This recording couldn’t be played. Try again, or check your connection.')
    } finally {
      if (request === playRequest) setStarting(false)
    }
  }

  function togglePlayback() {
    if (playing() || starting()) {
      playRequest++
      audio?.pause()
      setStarting(false)
      setWaiting(false)
    } else void play()
  }

  function playTrack(track: Track) {
    if (activeTrack()?.id === track.id) togglePlayback()
    else {
      audio?.pause()
      setSelectedId(track.id)
      queueMicrotask(() => { void play() })
    }
  }

  function seek(value: number) {
    if (!audio || !duration()) return
    try {
      audio.currentTime = Math.min(Math.max(value, 0), duration())
      setElapsed(audio.currentTime)
    } catch {
      setMediaError('Seeking isn’t available yet. Give the recording a moment to load.')
    }
  }

  function changeVolume(value: number) {
    setVolume(value)
    setMuted(value === 0)
    if (audio) { audio.volume = value; audio.muted = value === 0 }
  }

  function toggleMute() {
    const next = !muted()
    if (!next && volume() === 0) changeVolume(0.5)
    setMuted(next)
    if (audio) audio.muted = next
  }

  const isBusy = () => starting() || waiting()
  const playLabel = () => playing() || starting() ? 'Pause' : 'Play'
  const countLabel = () => `${tracks.data?.tracks.length ?? 0} ${(tracks.data?.tracks.length ?? 0) === 1 ? 'recording' : 'recordings'}`

  return <div class="app-shell">
    <a class="skip-link" href="#collection">Skip to your collection</a>
    <aside class="sidebar" aria-label="Main navigation">
      <Link to="/" class="brand" aria-label="Mangrove home"><BotanicalMark /><span>Mangrove<span class="brand-dot">.</span></span></Link>
      <div class="sidebar-body">
        <p class="sidebar-label">Your little corner</p>
        <nav><Link to="/" class="nav-item" activeProps={{ 'aria-current': 'page' }}><Library size={18} strokeWidth={1.6} /> Your collection <span class="nav-indicator" /></Link></nav>
      </div>
      <div class="sidebar-note">
        <svg width="132" height="45" viewBox="0 0 132 45" fill="none" aria-hidden="true"><path d="M1 23c11 0 8-12 15-12s4 24 11 24 4-33 11-33 3 41 11 41 4-30 11-30 4 21 11 21 4-31 11-31 4 36 11 36 4-25 11-25 3 13 11 13 7-5 16-5" stroke="currentColor" stroke-width="1.2" /></svg>
        <p>Less noise.<br />More feeling.</p>
        <span>A place for the music<br />you come back to.</span>
      </div>
      <div class="sidebar-foot"><BotanicalMark /><span>Let the outside wait.</span></div>
    </aside>

    <div class="main-shell">
      <header class="topbar"><span class="topbar-location"><Headphones size={16} strokeWidth={1.7} /> Your listening room</span><span class="topbar-note">A moment, just for you <span aria-hidden="true">↗</span></span></header>
      <main id="collection" class="main-content">
        <div class="page-intro"><div><div class="eyebrow"><span /> Settle in. Press play.</div><h1>Room to listen.</h1><p>A little space for the music that stays with you.</p></div><span class="intro-ornament" aria-hidden="true"><BotanicalMark /></span></div>

        <section class="featured" aria-label="Featured recording">
          <div class="sleeve-wrap"><Artwork /><span class="sleeve-shadow" aria-hidden="true" /></div>
          <div class="featured-details">
            <Show when={activeTrack()} fallback={<div class="empty-feature">
              <span class="section-kicker">Your collection</span>
              <h2>{tracks.isPending ? 'Good things take a moment.' : tracks.isError ? 'A quiet interruption.' : 'A little room for something good.'}</h2>
              <p>{tracks.isPending ? 'Bringing your recordings into the room…' : tracks.isError ? 'We couldn’t bring your collection into the room.' : 'Your collection is waiting for its first recording.'}</p>
              <Show when={tracks.isError}><button class="primary-button" onClick={() => void tracks.refetch()} disabled={tracks.isFetching}><RefreshCw size={17} class={tracks.isFetching ? 'spin' : ''} />Try again</button></Show>
            </div>}>
              {(track) => <>
                <span class="section-kicker"><span class="fine-line" /> From your collection</span>
                <h2 class="song-title">{track().title}</h2>
                <p class="artist-name">{track().artist}</p>
                <div class="recording-details"><span>Recorded {recordedDate(track().recordedAt)}</span><span class="detail-dot">·</span><span>{duration() ? formatTime(duration()) : 'Original recording'}</span></div>
                <div class="hero-actions"><button class="primary-button" onClick={togglePlayback} aria-label={`${playLabel()} ${track().title}`}>
                  <Show when={isBusy()} fallback={<Show when={playing()} fallback={<Play size={17} fill="currentColor" strokeWidth={1.5} />}><Pause size={17} fill="currentColor" strokeWidth={1.5} /></Show>}><LoaderCircle size={18} class="spin" /></Show>
                  {starting() ? 'Pause loading' : waiting() ? 'Pause buffering' : playing() ? 'Pause recording' : 'Play recording'}
                </button><span class="hero-listening-note"><Headphones size={15} strokeWidth={1.5} /> Best with a little time.</span></div>
                <p class="sleeve-caption">No shuffle. No rush. Just listen.</p>
              </>}
            </Show>
          </div>
        </section>

        <Show when={mediaError()}><div class="notice media-notice" role="alert"><CircleAlert size={18} /><p>{mediaError()}</p><button class="text-button" onClick={() => void play()}><RefreshCw size={14} /> Try playback again</button></div></Show>
        <Show when={tracks.isError}><div class="notice" role="alert"><CircleAlert size={18} /><p>{tracks.error?.message ?? 'Your collection couldn’t be loaded.'}</p><button class="text-button" onClick={() => void tracks.refetch()} disabled={tracks.isFetching}>Retry <ArrowRight size={14} /></button></div></Show>

        <section class="collection-section" aria-labelledby="collection-heading" aria-busy={tracks.isPending}>
          <div class="collection-header"><h2 id="collection-heading">In your collection<span class="collection-heading-dot">.</span></h2><Show when={tracks.data}><span>{countLabel()}</span></Show></div>
          <div class="track-table" role="table" aria-label="Your recordings">
            <div class="track-table-head" role="row"><span role="columnheader" class="track-number">#</span><span role="columnheader">Recording</span><span role="columnheader" class="date-column">Date recorded</span><span role="columnheader" class="duration-column">Length</span><span class="sr-only" role="columnheader">Playback</span></div>
            <Show when={!tracks.isPending} fallback={<div class="track-loading" role="status"><LoaderCircle size={17} class="spin" /> Loading your collection…</div>}>
              <For each={tracks.data?.tracks}>{(track, index) => <div class="track-row" role="row" classList={{ 'track-row-active': activeTrack()?.id === track.id }}>
                <span class="track-number" role="cell"><Show when={playing() && activeTrack()?.id === track.id} fallback={String(index() + 1).padStart(2, '0')}><span class="equalizer" aria-label="Playing"><i /><i /><i /></span></Show></span>
                <span class="track-title-cell" role="cell"><span class="track-thumb" aria-hidden="true"><BotanicalMark /></span><span><span class="track-title">{track.title}</span><span class="track-artist">{track.artist}</span></span></span>
                <span class="date-column" role="cell">{recordedDate(track.recordedAt, true)}</span><span class="duration-column" role="cell">{activeTrack()?.id === track.id && duration() ? formatTime(duration()) : '—'}</span>
                <span role="cell"><button class="row-play icon-button" aria-label={`${activeTrack()?.id === track.id ? playLabel() : 'Play'} ${track.title}`} onClick={() => playTrack(track)}><Show when={activeTrack()?.id === track.id && playing()} fallback={<Play size={15} fill="currentColor" />}><Pause size={15} fill="currentColor" /></Show></button></span>
              </div>}</For>
              <Show when={tracks.data?.tracks.length === 0}><p class="empty-collection">No recordings here yet. Your first one will feel right at home.</p></Show>
            </Show>
          </div>
        </section>

        <footer class="room-footer"><span>Carefully kept. Simply played.</span><div class="connection-status" aria-live="polite">
          <Show when={!health.isPending} fallback={<><span class="status-dot pending" />Checking connection</>}>
            <Show when={health.isSuccess && !health.isError} fallback={<><span class="status-dot offline" /><span>Collection connection unavailable</span><button class="text-button" onClick={() => void health.refetch()} disabled={health.isFetching} aria-label="Retry collection connection"><RefreshCw size={13} class={health.isFetching ? 'spin' : ''} /></button></>}><span class="status-dot" />Collection connected</Show>
          </Show>
        </div></footer>
      </main>
    </div>

    <Show when={activeTrack()} keyed>{(track) => <audio
      ref={(element) => { audio = element; element.volume = volume(); element.muted = muted() }}
      src={track.streamUrl} preload="metadata" loop={repeat()}
      onLoadedMetadata={updateDuration} onDurationChange={updateDuration}
      onTimeUpdate={() => setElapsed(audio?.currentTime ?? 0)}
      onPlaying={() => { setPlaying(true); setStarting(false); setWaiting(false); setMediaError('') }}
      onPause={() => { setPlaying(false); setStarting(false); setWaiting(false) }}
      onWaiting={() => { if (audio && !audio.paused) setWaiting(true) }}
      onCanPlay={() => setWaiting(false)}
      onEnded={() => { setPlaying(false); setWaiting(false) }}
      onError={() => { setPlaying(false); setStarting(false); setWaiting(false); setMediaError('The recording couldn’t be loaded. Try playback again to reconnect.') }}
    />}</Show>

    <section class="player" aria-label="Audio player">
      <div class="player-track"><Show when={activeTrack()} fallback={<><div class="player-empty-art"><BotanicalMark /></div><div><p class="player-track-name">Your listening room</p><p class="player-track-artist">A little quiet, for now.</p></div></>}>
        {(track) => <><Artwork small /><div><p class="player-track-name">{track().title}</p><p class="player-track-artist">{track().artist}</p></div></>}
      </Show></div>
      <div class="transport">
        <div class="transport-buttons"><span class="playback-state" role="status">{mediaError() ? 'Playback unavailable' : isBusy() ? 'Loading audio…' : playing() ? 'Now playing' : elapsed() > 0 ? 'Take your time' : 'Ready when you are'}</span><button class="player-play" onClick={togglePlayback} disabled={!activeTrack()} aria-label={playLabel()}>
          <Show when={isBusy()} fallback={<Show when={playing()} fallback={<Play size={19} fill="currentColor" strokeWidth={1.5} />}><Pause size={19} fill="currentColor" strokeWidth={1.5} /></Show>}><LoaderCircle size={19} class="spin" /></Show>
        </button><button class="icon-button repeat-button" classList={{ 'is-active': repeat() }} aria-label="Repeat recording" aria-pressed={repeat()} disabled={!activeTrack()} onClick={() => setRepeat(!repeat())}><Repeat1 size={19} strokeWidth={1.7} /><span class="repeat-dot" /></button></div>
        <div class="seek-control"><span class="time elapsed-time">{formatTime(elapsed())}</span><input type="range" class="range seek-range" min="0" max={duration() || 0} step="0.1" value={elapsed()} disabled={!duration()} aria-label="Seek recording" aria-valuetext={`${formatTime(elapsed())} of ${duration() ? formatTime(duration()) : 'unknown duration'}`} style={{ '--progress': `${duration() ? elapsed() / duration() * 100 : 0}%` }} onInput={(event) => seek(Number(event.currentTarget.value))} /><span class="time">{duration() ? formatTime(duration()) : '—:—'}</span></div>
      </div>
      <div class="volume-control"><button class="icon-button" aria-label={muted() ? 'Unmute' : 'Mute'} aria-pressed={muted()} onClick={toggleMute}><Show when={!muted() && volume() > 0} fallback={<VolumeX size={19} strokeWidth={1.7} />}><Volume2 size={19} strokeWidth={1.7} /></Show></button><input class="range volume-range" type="range" min="0" max="1" step="0.01" value={muted() ? 0 : volume()} aria-label="Volume" aria-valuetext={`${muted() ? 0 : Math.round(volume() * 100)} percent`} style={{ '--progress': `${muted() ? 0 : volume() * 100}%` }} onInput={(event) => changeVolume(Number(event.currentTarget.value))} /><span class="volume-label">{muted() ? 0 : Math.round(volume() * 100)}%</span></div>
    </section>
  </div>
}
