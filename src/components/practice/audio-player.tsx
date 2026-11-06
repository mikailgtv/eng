"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  /** Accessible label, e.g. "Listening audio 1". */
  label?: string;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Reusable, accessible audio player: play/pause, seekable progress bar,
 * replay, and volume (where supported). Never autoplays; large touch
 * targets; full keyboard support; progress announced via aria-valuetext.
 */
export function AudioPlayer({ src, label = "Audio", compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Start from a clean slate when the source changes, then seed from the element itself:
    // with `preload="metadata"` on a small/cached file, `loadedmetadata` and `durationchange`
    // can both fire before this effect runs, which previously left the UI stuck at 0:00.
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setError(false);

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const syncPosition = () => {
      if (Number.isFinite(audio.currentTime)) setCurrent(audio.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    const onError = () => setError(true);

    // Apply whatever the element already knows.
    syncDuration();
    syncPosition();
    if (audio.error) setError(true);

    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("canplay", syncDuration);
    audio.addEventListener("timeupdate", syncPosition);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("canplay", syncDuration);
      audio.removeEventListener("timeupdate", syncPosition);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError(true));
    }
  }

  function toggleRate() {
    const next = rate === 1 ? 0.75 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function replay() {
    const audio = audioRef.current;
    if (!audio || error) return;
    audio.currentTime = 0;
    audio.play().then(() => setPlaying(true)).catch(() => setError(true));
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const limit = Number.isFinite(duration) && duration > 0 ? duration : audio?.duration ?? 0;
    if (!audio || !Number.isFinite(limit) || limit <= 0) return;
    const t = Math.min(Math.max(Number(e.target.value), 0), limit);
    audio.currentTime = t;
    setCurrent(t);
  }

  function onVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  if (error) {
    return (
      <p role="status" className="rounded-lg bg-muted/10 px-3 py-2 text-[13px] text-muted">
        Audio is not available right now.
      </p>
    );
  }

  // Guard against NaN/Infinity durations (unloaded or streamed media) so the range and
  // readouts always receive a finite value.
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const buttonSize = compact ? "h-9 w-9" : "h-11 w-11";

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5 shadow-card sm:gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className={`inline-flex ${buttonSize} shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover`}
      >
        {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="ml-0.5 h-5 w-5" aria-hidden />}
      </button>

      <button
        type="button"
        onClick={replay}
        aria-label={`Replay ${label} from the start`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={toggleRate}
        aria-pressed={rate < 1}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-2 text-xs font-medium text-muted hover:bg-muted/10"
      >
        {rate < 1 ? "Slow" : "Speed"}
      </button>

      {/* Seekable progress */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={current}
          onChange={onSeek}
          aria-label={`Seek ${label}`}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted/25 accent-teal-800"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted" aria-hidden>
          {formatTime(current)} / {formatTime(safeDuration)}
        </span>
        <span className="sr-only" role="timer" aria-label={`${label} position`}>
          {formatTime(current)} of {formatTime(safeDuration)}
        </span>
      </div>

      {/* Volume (hidden on touch-first small screens) */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <Volume2 className="h-4 w-4 text-muted" aria-hidden />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={onVolume}
          aria-label={`${label} volume`}
          className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-muted/25 accent-teal-800"
        />
      </div>
    </div>
  );
}
