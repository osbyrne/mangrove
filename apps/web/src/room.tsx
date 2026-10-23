import { InstallServer } from "./components/InstallServer";
import * as stylex from "@stylexjs/stylex";
import { styles, dynamicStyles } from "./styles";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import {
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Repeat1,
  Volume2,
  VolumeX,
} from "lucide-solid";
import { getHealth, getTracks, uploadSong } from "./lib/api";
import type { Track } from "./lib/api";

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function recordedDate(value: string, short = false) {
  return new Intl.DateTimeFormat("en", {
    month: short ? "short" : "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function ListeningRoom() {
  const tracks = createQuery(() => ({
    queryKey: ["tracks"],
    queryFn: ({ signal }) => getTracks(signal),
  }));
  const health = createQuery(() => ({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 60_000,
  }));
  const [uploading, setUploading] = createSignal(false);
  const [uploadStatus, setUploadStatus] = createSignal("");
  const [uploadError, setUploadError] = createSignal("");
  let fileInput: HTMLInputElement | undefined;
  const uploadAbort = new AbortController();
  onCleanup(() => uploadAbort.abort());
  async function uploadFiles(files: FileList | null) {
    if (!files?.length || uploading()) return;
    setUploading(true);
    setUploadError("");
    let completed = 0;
    try {
      for (const file of Array.from(files)) {
        setUploadStatus(`Uploading ${file.name} (${completed + 1}/${files.length})…`);
        await uploadSong(file, uploadAbort.signal);
        completed++;
      }
      setUploadStatus(`${completed} ${completed === 1 ? "song uploaded" : "songs uploaded"}.`);
    } catch (error) {
      setUploadStatus(completed ? `${completed} songs uploaded.` : "");
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput) fileInput.value = "";
      await Promise.all([tracks.refetch(), health.refetch()]);
    }
  }
  const [selectedId, setSelectedId] = createSignal<string>();
  const activeTrack = () =>
    tracks.data?.tracks.find((track) => track.id === selectedId()) ??
    tracks.data?.tracks[0];
  const [playing, setPlaying] = createSignal(false);
  const [starting, setStarting] = createSignal(false);
  const [waiting, setWaiting] = createSignal(false);
  const [duration, setDuration] = createSignal(0);
  const [elapsed, setElapsed] = createSignal(0);
  const [volume, setVolume] = createSignal(0.8);
  const [muted, setMuted] = createSignal(false);
  const [repeat, setRepeat] = createSignal(false);
  const [mediaError, setMediaError] = createSignal("");
  let audio: HTMLAudioElement | undefined;
  let playRequest = 0;

  const updateDuration = () => {
    setDuration(audio && Number.isFinite(audio.duration) ? audio.duration : 0);
  };

  createEffect(() => {
    activeTrack()?.id;
    playRequest++;
    setPlaying(false);
    setStarting(false);
    setWaiting(false);
    setDuration(0);
    setElapsed(0);
    setMediaError("");
  });
  onCleanup(() => {
    playRequest++;
    audio?.pause();
  });

  async function play() {
    const element = audio;
    if (!element || !activeTrack()) return;
    const request = ++playRequest;
    setMediaError("");
    setStarting(true);
    try {
      if (element.error) element.load();
      await element.play();
    } catch (error) {
      if (request !== playRequest) return;
      setPlaying(false);
      setWaiting(false);
      setMediaError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Your browser paused this request. Press play to start listening."
          : "This recording couldn’t be played. Try again, or check your connection.",
      );
    } finally {
      if (request === playRequest) setStarting(false);
    }
  }

  function togglePlayback() {
    if (playing() || starting()) {
      playRequest++;
      audio?.pause();
      setStarting(false);
      setWaiting(false);
    } else void play();
  }

  function playTrack(track: Track) {
    if (activeTrack()?.id === track.id) togglePlayback();
    else {
      audio?.pause();
      setSelectedId(track.id);
      queueMicrotask(() => {
        void play();
      });
    }
  }

  function seek(value: number) {
    if (!audio || !duration()) return;
    try {
      audio.currentTime = Math.min(Math.max(value, 0), duration());
      setElapsed(audio.currentTime);
    } catch {
      setMediaError(
        "Seeking isn’t available yet. Give the recording a moment to load.",
      );
    }
  }

  function changeVolume(value: number) {
    setVolume(value);
    setMuted(value === 0);
    if (audio) {
      audio.volume = value;
      audio.muted = value === 0;
    }
  }

  function toggleMute() {
    const next = !muted();
    if (!next && volume() === 0) changeVolume(0.5);
    setMuted(next);
    if (audio) audio.muted = next;
  }

  const isBusy = () => starting() || waiting();
  const playLabel = () => (playing() || starting() ? "Pause" : "Play");
  const countLabel = () =>
    `${tracks.data?.tracks.length ?? 0} ${(tracks.data?.tracks.length ?? 0) === 1 ? "recording" : "recordings"}`;

  return (
    <div {...stylex.attrs(styles.base, styles.appShell)}>
      <a
        {...stylex.attrs(
          styles.base,
          styles.tapTarget,
          styles.focusRing,
          styles.touchTarget,
          styles.link,
          styles.skipLink,
        )}
        href="#collection"
      >
        Skip to recordings
      </a>
      <div {...stylex.attrs(styles.base, styles.mainShell)}>
        <img
          {...stylex.attrs(styles.base, styles.appLogo)}
          src="/logo.webp"
          alt="Mangrove"
          width="64"
          height="64"
        />
        <main
          {...stylex.attrs(styles.base, styles.mainContent)}
          id="collection"
        >
          <section
            {...stylex.attrs(styles.base, styles.featured)}
            aria-label="Featured recording"
          >
            <div {...stylex.attrs(styles.base, styles.featuredDetails)}>
              <Show
                when={activeTrack()}
                fallback={
                  <div {...stylex.attrs(styles.base)}>
                    <h2
                      {...stylex.attrs(
                        styles.base,
                        styles.textReset,
                        styles.emptyHeading,
                      )}
                    >
                      {tracks.isPending
                        ? "Loading recordings…"
                        : tracks.isError
                          ? "Couldn’t load recordings."
                          : "No recordings yet."}
                    </h2>
                    <p
                      {...stylex.attrs(
                        styles.base,
                        styles.textReset,
                        styles.emptyDescription,
                      )}
                    >
                      {tracks.isPending
                        ? "Loading recordings…"
                        : tracks.isError
                          ? "Try loading recordings again."
                          : "Add a recording to get started."}
                    </p>
                    <Show when={tracks.isError}>
                      <button
                        {...stylex.attrs(
                          styles.base,
                          styles.tapTarget,
                          styles.focusRing,
                          styles.touchTarget,
                          styles.controlFont,
                          styles.button,
                          styles.primaryButton,
                        )}
                        onClick={() => void tracks.refetch()}
                        disabled={tracks.isFetching}
                      >
                        <RefreshCw
                          {...stylex.attrs(
                            styles.svg,
                            styles.icon17,
                            tracks.isFetching ? styles.spin : null,
                          )}
                        />
                        Try again
                      </button>
                    </Show>
                  </div>
                }
              >
                {(track) => (
                  <>
                    <h2
                      {...stylex.attrs(
                        styles.base,
                        styles.textReset,
                        styles.songTitle,
                      )}
                    >
                      {track().title}
                    </h2>
                    <p
                      {...stylex.attrs(
                        styles.base,
                        styles.textReset,
                        styles.artistName,
                      )}
                    >
                      {track().artist}
                    </p>
                    <div
                      {...stylex.attrs(styles.base, styles.recordingDetails)}
                    >
                      <span {...stylex.attrs(styles.base)}>
                        {track().uploadedAt ? "Uploaded" : "Recorded"} {recordedDate(track().recordedAt)}
                      </span>
                      <span {...stylex.attrs(styles.base, styles.detailDot)}>
                        ·
                      </span>
                      <span {...stylex.attrs(styles.base)}>
                        {duration()
                          ? formatTime(duration())
                          : "Original recording"}
                      </span>
                    </div>
                    <div {...stylex.attrs(styles.base, styles.heroActions)}>
                      <button
                        {...stylex.attrs(
                          styles.base,
                          styles.tapTarget,
                          styles.focusRing,
                          styles.touchTarget,
                          styles.controlFont,
                          styles.button,
                          styles.primaryButton,
                        )}
                        onClick={togglePlayback}
                        aria-label={`${playLabel()} ${track().title}`}
                      >
                        <Show
                          when={isBusy()}
                          fallback={
                            <Show
                              when={playing()}
                              fallback={
                                <Play
                                  {...stylex.attrs(
                                    styles.svg,
                                    styles.icon17,
                                    styles.filledIcon,
                                    styles.stroke15,
                                  )}
                                />
                              }
                            >
                              <Pause
                                {...stylex.attrs(
                                  styles.svg,
                                  styles.icon17,
                                  styles.filledIcon,
                                  styles.stroke15,
                                )}
                              />
                            </Show>
                          }
                        >
                          <LoaderCircle
                            {...stylex.attrs(
                              styles.svg,
                              styles.icon18,
                              styles.spin,
                            )}
                          />
                        </Show>
                        {starting()
                          ? "Pause loading"
                          : waiting()
                            ? "Pause buffering"
                            : playing()
                              ? "Pause recording"
                              : "Play recording"}
                      </button>
                    </div>
                  </>
                )}
              </Show>
            </div>
          </section>

          <Show when={mediaError()}>
            <div {...stylex.attrs(styles.base, styles.notice)} role="alert">
              <CircleAlert
                {...stylex.attrs(styles.svg, styles.icon18, styles.noticeIcon)}
              />
              <p
                {...stylex.attrs(
                  styles.base,
                  styles.textReset,
                  styles.noticeText,
                )}
              >
                {mediaError()}
              </p>
              <button
                {...stylex.attrs(
                  styles.base,
                  styles.tapTarget,
                  styles.focusRing,
                  styles.touchTarget,
                  styles.controlFont,
                  styles.button,
                  styles.textButton,
                  styles.noticeButton,
                )}
                onClick={() => void play()}
              >
                <RefreshCw
                  {...stylex.attrs(
                    styles.svg,
                    styles.icon14,
                    styles.noticeIcon,
                  )}
                />{" "}
                Try playback again
              </button>
            </div>
          </Show>
          <Show when={tracks.isError}>
            <div {...stylex.attrs(styles.base, styles.notice)} role="alert">
              <CircleAlert
                {...stylex.attrs(styles.svg, styles.icon18, styles.noticeIcon)}
              />
              <p
                {...stylex.attrs(
                  styles.base,
                  styles.textReset,
                  styles.noticeText,
                )}
              >
                {tracks.error?.message ?? "Recordings couldn’t be loaded."}
              </p>
              <button
                {...stylex.attrs(
                  styles.base,
                  styles.tapTarget,
                  styles.focusRing,
                  styles.touchTarget,
                  styles.controlFont,
                  styles.button,
                  styles.textButton,
                  styles.noticeButton,
                )}
                onClick={() => void tracks.refetch()}
                disabled={tracks.isFetching}
              >
                Retry{" "}
                <ArrowRight
                  {...stylex.attrs(
                    styles.svg,
                    styles.icon14,
                    styles.noticeIcon,
                  )}
                />
              </button>
            </div>
          </Show>

          <section
            {...stylex.attrs(styles.base, styles.collectionSection)}
            aria-labelledby="collection-heading"
            aria-busy={tracks.isPending}
          >
            <div {...stylex.attrs(styles.base, styles.collectionHeader)}>
              <h2
                {...stylex.attrs(
                  styles.base,
                  styles.textReset,
                  styles.collectionHeading,
                )}
                id="collection-heading"
              >
                Recordings
                <span
                  {...stylex.attrs(styles.base, styles.collectionHeadingDot)}
                >
                  .
                </span>
              </h2>
              <Show when={tracks.data}>
                <span {...stylex.attrs(styles.base, styles.collectionCount)}>
                  {countLabel()}
                </span>
              </Show>
            </div>
            <div {...stylex.attrs(styles.base, styles.uploadControls)}>
              <input ref={fileInput} type="file" hidden multiple
                accept=".mp3,.m4a,.flac,.wav,.ogg,.opus"
                aria-label="Choose songs to upload"
                onChange={(event) => void uploadFiles(event.currentTarget.files)} />
              <button type="button" disabled={uploading()}
                {...stylex.attrs(styles.base, styles.tapTarget, styles.focusRing, styles.touchTarget, styles.controlFont, styles.button, styles.primaryButton)}
                onClick={() => fileInput?.click()}>
                {uploading() ? "Uploading…" : "Upload songs"}
              </button>
              <span role="status" {...stylex.attrs(styles.base, styles.uploadStatus)}>{uploadStatus()}</span>
              <Show when={uploadError()}><span role="alert" {...stylex.attrs(styles.base, styles.uploadStatus)}>{uploadError()}</span></Show>
            </div>
            <div
              {...stylex.attrs(styles.base)}
              role="table"
              aria-label="Your recordings"
            >
              <div
                {...stylex.attrs(styles.base, styles.trackTableHead)}
                role="row"
              >
                <span
                  {...stylex.attrs(styles.base, styles.trackNumber)}
                  role="columnheader"
                >
                  #
                </span>
                <span {...stylex.attrs(styles.base)} role="columnheader">
                  Recording
                </span>
                <span
                  {...stylex.attrs(styles.base, styles.dateColumn)}
                  role="columnheader"
                >
                  Date
                </span>
                <span
                  {...stylex.attrs(styles.base, styles.durationColumn)}
                  role="columnheader"
                >
                  Length
                </span>
                <span
                  {...stylex.attrs(styles.base, styles.srOnly)}
                  role="columnheader"
                >
                  Playback
                </span>
              </div>
              <Show
                when={!tracks.isPending}
                fallback={
                  <div
                    {...stylex.attrs(styles.base, styles.trackLoading)}
                    role="status"
                  >
                    <LoaderCircle
                      {...stylex.attrs(styles.svg, styles.icon17, styles.spin)}
                    />{" "}
                    Loading recordings…
                  </div>
                }
              >
                <For each={tracks.data?.tracks}>
                  {(track, index) => (
                    <div
                      {...stylex.attrs(
                        styles.base,
                        styles.trackRow,
                        activeTrack()?.id === track.id && styles.trackRowActive,
                      )}
                      role="row"
                    >
                      <span
                        {...stylex.attrs(styles.base, styles.trackNumber)}
                        role="cell"
                      >
                        <Show
                          when={playing() && activeTrack()?.id === track.id}
                          fallback={String(index() + 1).padStart(2, "0")}
                        >
                          <span
                            {...stylex.attrs(styles.base, styles.equalizer)}
                            aria-label="Playing"
                          >
                            <i
                              {...stylex.attrs(
                                styles.base,
                                styles.equalizerBar,
                              )}
                            />
                            <i
                              {...stylex.attrs(
                                styles.base,
                                styles.equalizerBar,
                                styles.equalizerBarSecond,
                              )}
                            />
                            <i
                              {...stylex.attrs(
                                styles.base,
                                styles.equalizerBar,
                                styles.equalizerBarThird,
                              )}
                            />
                          </span>
                        </Show>
                      </span>
                      <span
                        {...stylex.attrs(styles.base, styles.trackTitleCell)}
                        role="cell"
                      >
                        <span
                          {...stylex.attrs(styles.base, styles.trackTitleText)}
                        >
                          <span
                            {...stylex.attrs(styles.base, styles.trackTitle)}
                          >
                            {track.title}
                          </span>
                          <span
                            {...stylex.attrs(styles.base, styles.trackArtist)}
                          >
                            {track.artist}
                          </span>
                        </span>
                      </span>
                      <span
                        {...stylex.attrs(styles.base, styles.dateColumn)}
                        role="cell"
                      >
                        {recordedDate(track.recordedAt, true)}
                      </span>
                      <span
                        {...stylex.attrs(styles.base, styles.durationColumn)}
                        role="cell"
                      >
                        {activeTrack()?.id === track.id && duration()
                          ? formatTime(duration())
                          : "—"}
                      </span>
                      <span {...stylex.attrs(styles.base)} role="cell">
                        <button
                          {...stylex.attrs(
                            styles.base,
                            styles.tapTarget,
                            styles.focusRing,
                            styles.touchTarget,
                            styles.controlFont,
                            styles.button,
                            styles.iconButton,
                            styles.rowPlay,
                          )}
                          aria-label={`${activeTrack()?.id === track.id ? playLabel() : "Play"} ${track.title}`}
                          onClick={() => playTrack(track)}
                        >
                          <Show
                            when={activeTrack()?.id === track.id && playing()}
                            fallback={
                              <Play
                                {...stylex.attrs(
                                  styles.svg,
                                  styles.icon15,
                                  styles.filledIcon,
                                )}
                              />
                            }
                          >
                            <Pause
                              {...stylex.attrs(
                                styles.svg,
                                styles.icon15,
                                styles.filledIcon,
                              )}
                            />
                          </Show>
                        </button>
                      </span>
                    </div>
                  )}
                </For>
                <Show when={tracks.data?.tracks.length === 0}>
                  <p
                    {...stylex.attrs(
                      styles.base,
                      styles.textReset,
                      styles.emptyCollection,
                    )}
                  >
                    No recordings yet.
                  </p>
                </Show>
              </Show>
            </div>
          </section>

          <InstallServer />

          <footer {...stylex.attrs(styles.base, styles.roomFooter)}>
            <div
              {...stylex.attrs(styles.base, styles.connectionStatus)}
              aria-live="polite"
            >
              <Show
                when={!health.isPending}
                fallback={
                  <>
                    <span
                      {...stylex.attrs(
                        styles.base,
                        styles.statusDot,
                        styles.statusPending,
                      )}
                    />
                    Checking connection
                  </>
                }
              >
                <Show
                  when={health.isSuccess && !health.isError}
                  fallback={
                    <>
                      <span
                        {...stylex.attrs(
                          styles.base,
                          styles.statusDot,
                          styles.statusOffline,
                        )}
                      />
                      <span {...stylex.attrs(styles.base)}>
                        Collection connection unavailable
                      </span>
                      <button
                        {...stylex.attrs(
                          styles.base,
                          styles.tapTarget,
                          styles.focusRing,
                          styles.touchTarget,
                          styles.controlFont,
                          styles.button,
                          styles.textButton,
                          styles.footerButton,
                        )}
                        onClick={() => void health.refetch()}
                        disabled={health.isFetching}
                        aria-label="Retry collection connection"
                      >
                        <RefreshCw
                          {...stylex.attrs(
                            styles.svg,
                            styles.icon13,
                            health.isFetching ? styles.spin : null,
                          )}
                        />
                      </button>
                    </>
                  }
                >
                  <span {...stylex.attrs(styles.base, styles.statusDot)} />
                  Collection connected
                </Show>
              </Show>
            </div>
          </footer>
        </main>
      </div>

      <Show when={activeTrack()} keyed>
        {(track) => (
          <audio
            {...stylex.attrs(styles.base)}
            ref={(element) => {
              audio = element;
              element.volume = volume();
              element.muted = muted();
            }}
            src={track.streamUrl}
            preload="metadata"
            loop={repeat()}
            onLoadedMetadata={updateDuration}
            onDurationChange={updateDuration}
            onTimeUpdate={() => setElapsed(audio?.currentTime ?? 0)}
            onPlaying={() => {
              setPlaying(true);
              setStarting(false);
              setWaiting(false);
              setMediaError("");
            }}
            onPause={() => {
              setPlaying(false);
              setStarting(false);
              setWaiting(false);
            }}
            onWaiting={() => {
              if (audio && !audio.paused) setWaiting(true);
            }}
            onCanPlay={() => setWaiting(false)}
            onEnded={() => {
              setPlaying(false);
              setWaiting(false);
            }}
            onError={() => {
              setPlaying(false);
              setStarting(false);
              setWaiting(false);
              setMediaError(
                "The recording couldn’t be loaded. Try playback again to reconnect.",
              );
            }}
          />
        )}
      </Show>

      <section
        {...stylex.attrs(styles.base, styles.player)}
        aria-label="Audio player"
      >
        <div {...stylex.attrs(styles.base, styles.playerTrack)}>
          <Show
            when={activeTrack()}
          >
            {(track) => (
              <>
                <div {...stylex.attrs(styles.base, styles.playerTrackText)}>
                  <p
                    {...stylex.attrs(
                      styles.base,
                      styles.textReset,
                      styles.playerTrackName,
                    )}
                  >
                    {track().title}
                  </p>
                  <p
                    {...stylex.attrs(
                      styles.base,
                      styles.textReset,
                      styles.playerTrackArtist,
                    )}
                  >
                    {track().artist}
                  </p>
                </div>
              </>
            )}
          </Show>
        </div>
        <div {...stylex.attrs(styles.base, styles.transport)}>
          <div {...stylex.attrs(styles.base, styles.transportButtons)}>
            <span
              {...stylex.attrs(styles.base, styles.playbackState)}
              role="status"
            >
              {mediaError()
                ? "Playback unavailable"
                : isBusy()
                  ? "Loading audio…"
                  : playing()
                    ? "Now playing"
                    : ""}
            </span>
            <button
              {...stylex.attrs(
                styles.base,
                styles.tapTarget,
                styles.focusRing,
                styles.touchTarget,
                styles.controlFont,
                styles.button,
                styles.playerPlay,
              )}
              onClick={togglePlayback}
              disabled={!activeTrack()}
              aria-label={playLabel()}
            >
              <Show
                when={isBusy()}
                fallback={
                  <Show
                    when={playing()}
                    fallback={
                      <Play
                        {...stylex.attrs(
                          styles.svg,
                          styles.icon19,
                          styles.filledIcon,
                          styles.stroke15,
                          styles.playerPlayIcon,
                          styles.playIcon,
                        )}
                      />
                    }
                  >
                    <Pause
                      {...stylex.attrs(
                        styles.svg,
                        styles.icon19,
                        styles.filledIcon,
                        styles.stroke15,
                        styles.playerPlayIcon,
                      )}
                    />
                  </Show>
                }
              >
                <LoaderCircle
                  {...stylex.attrs(
                    styles.svg,
                    styles.icon19,
                    styles.spin,
                    styles.playerPlayIcon,
                  )}
                />
              </Show>
            </button>
            <button
              {...stylex.attrs(
                styles.base,
                styles.tapTarget,
                styles.focusRing,
                styles.touchTarget,
                styles.controlFont,
                styles.button,
                styles.iconButton,
                styles.repeatButton,
                repeat() && styles.repeatActive,
              )}
              aria-label="Repeat recording"
              aria-pressed={repeat()}
              disabled={!activeTrack()}
              onClick={() => setRepeat(!repeat())}
            >
              <Repeat1
                {...stylex.attrs(styles.svg, styles.icon19, styles.stroke17)}
              />
              <span
                {...stylex.attrs(
                  styles.base,
                  styles.repeatDot,
                  repeat() && styles.repeatDotActive,
                )}
              />
            </button>
          </div>
          <div {...stylex.attrs(styles.base, styles.seekControl)}>
            <span {...stylex.attrs(styles.base, styles.time)}>
              {formatTime(elapsed())}
            </span>
            <input
              {...stylex.attrs(
                styles.base,
                styles.tapTarget,
                styles.focusRing,
                styles.controlFont,
                styles.range,
                styles.seekRange,
                dynamicStyles.progress(
                  `${duration() ? (elapsed() / duration()) * 100 : 0}%`,
                ),
              )}
              type="range"
              min="0"
              max={duration() || 0}
              step="0.1"
              value={elapsed()}
              disabled={!duration()}
              aria-label="Seek recording"
              aria-valuetext={`${formatTime(elapsed())} of ${duration() ? formatTime(duration()) : "unknown duration"}`}
              onInput={(event) => seek(Number(event.currentTarget.value))}
            />
            <span {...stylex.attrs(styles.base, styles.time, styles.timeEnd)}>
              {duration() ? formatTime(duration()) : "—:—"}
            </span>
          </div>
        </div>
        <div {...stylex.attrs(styles.base, styles.volumeControl)}>
          <button
            {...stylex.attrs(
              styles.base,
              styles.tapTarget,
              styles.focusRing,
              styles.touchTarget,
              styles.controlFont,
              styles.button,
              styles.iconButton,
              styles.volumeButton,
            )}
            aria-label={muted() ? "Unmute" : "Mute"}
            aria-pressed={muted()}
            onClick={toggleMute}
          >
            <Show
              when={!muted() && volume() > 0}
              fallback={
                <VolumeX
                  {...stylex.attrs(
                    styles.svg,
                    styles.icon19,
                    styles.stroke17,
                    styles.volumeIcon,
                  )}
                />
              }
            >
              <Volume2
                {...stylex.attrs(
                  styles.svg,
                  styles.icon19,
                  styles.stroke17,
                  styles.volumeIcon,
                )}
              />
            </Show>
          </button>
          <input
            {...stylex.attrs(
              styles.base,
              styles.tapTarget,
              styles.focusRing,
              styles.controlFont,
              styles.range,
              styles.volumeRange,
              dynamicStyles.progress(`${muted() ? 0 : volume() * 100}%`),
            )}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted() ? 0 : volume()}
            aria-label="Volume"
            aria-valuetext={`${muted() ? 0 : Math.round(volume() * 100)} percent`}
            onInput={(event) => changeVolume(Number(event.currentTarget.value))}
          />
          <span {...stylex.attrs(styles.base, styles.volumeLabel)}>
            {muted() ? 0 : Math.round(volume() * 100)}%
          </span>
        </div>
      </section>
    </div>
  );
}
