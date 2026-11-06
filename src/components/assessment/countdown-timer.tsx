"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownTimerProps {
  /** Server deadline (ISO). The browser clock is only used as a local ticker. */
  deadlineAt: string;
  /** Server "now" captured at render — used to correct client clock skew. */
  serverNow: string;
  onExpire?: () => void;
  compact?: boolean;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Exam countdown. The remaining time is derived from SERVER timestamps
 * (deadline − serverNow), so refreshing the page can never reset or extend
 * the timer — it only re-syncs. At zero it fires `onExpire` once.
 */
export function CountdownTimer({ deadlineAt, serverNow, onExpire, compact }: CountdownTimerProps) {
  // Offset between the real time (server) and this device's clock.
  const skewRef = useRef(0);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const skew = Date.now() - new Date(serverNow).getTime();
    skewRef.current = skew;
    return new Date(deadlineAt).getTime() - new Date(serverNow).getTime();
  });
  const firedRef = useRef(false);

  useEffect(() => {
    const deadline = new Date(deadlineAt).getTime();
    const tick = () => {
      const left = deadline - (Date.now() - skewRef.current);
      setRemainingMs(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, onExpire]);

  const expired = remainingMs <= 0;
  const urgent = !expired && remainingMs < 60_000;
  const minutesLeft = Math.ceil(remainingMs / 60_000);

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2"
          : "flex flex-col items-center gap-0.5"
      }
    >
      <span
        role="timer"
        aria-label={expired ? "Time is up" : `Time remaining ${format(remainingMs)}`}
        className={[
          "inline-flex items-center gap-1.5 rounded-lg font-semibold tabular-nums",
          compact ? "h-9 px-3 text-sm" : "h-11 px-4 text-lg",
          expired
            ? "bg-danger-subtle text-danger"
            : urgent
              ? "bg-danger-subtle text-danger"
              : "bg-primary-subtle text-primary",
        ].join(" ")}
      >
        {expired ? "Time is up" : format(remainingMs)}
      </span>
      {/* Announce each remaining minute to screen readers without spamming. */}
      {!expired && minutesLeft <= 5 && (
        <span className="sr-only" aria-live="polite">
          {minutesLeft} minute{minutesLeft === 1 ? "" : "s"} remaining
        </span>
      )}
    </div>
  );
}
