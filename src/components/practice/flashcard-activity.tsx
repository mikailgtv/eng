"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FlashcardItem {
  vocabularyId?: string;
  word: string;
  translation?: string;
  phonetic?: string;
  example?: string;
}

export interface FlashcardActivityProps {
  items: FlashcardItem[];
  /** Vocabulary ids already reviewed by this student (skip them). */
  initialMarks?: Record<string, "KNOWN" | "NEED_REVIEW">;
  onSubmit: (marks: { word: string; vocabularyId?: string; response: "KNOWN" | "NEED_REVIEW" }[]) => Promise<void>;
}

/**
 * Simple flashcards: front shows the word, tap to flip and reveal the
 * meaning + example, then self-assess: "I know it" or "Review again".
 * Self-assessment is NOT mastery — the review scheduler stores when the
 * word should come back.
 */
export function FlashcardActivity({ items, initialMarks, onSubmit }: FlashcardActivityProps) {
  const pending = items.filter((it) => !initialMarks?.[it.vocabularyId ?? it.word]);
  const [queue, setQueue] = useState<FlashcardItem[]>(pending);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [marks, setMarks] = useState<Record<string, "KNOWN" | "NEED_REVIEW">>(initialMarks ?? {});
  const [error, setError] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(pending.length === 0);

  // Keep queue authoritative when parent updates items (e.g., optimistic
  // header after review). We track the previous items key to avoid wiping
  // in-progress queue on unrelated re-renders.
  const prevKeyRef = useRef<string>(items.map((it) => it.vocabularyId ?? it.word).join("|"));
  useEffect(() => {
    const key = items.map((it) => it.vocabularyId ?? it.word).join("|");
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    const next = items.filter((it) => !initialMarks?.[it.vocabularyId ?? it.word]);
    setQueue(next);
    setFlipped(false);
    setSessionDone(next.length === 0);
  }, [items, initialMarks]);

  const current = queue[0];

  async function respond(response: "KNOWN" | "NEED_REVIEW") {
    if (!current || busy) return;
    const mark = { word: current.word, vocabularyId: current.vocabularyId, response };
    setBusy(true);
    setError(null);
    const remaining = queue.slice(1);
    try {
      await onSubmit([mark]);
      setMarks((m) => ({ ...m, [current.vocabularyId ?? current.word]: response }));
      setQueue(remaining);
      setFlipped(false);
      if (remaining.length === 0) setSessionDone(true);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionDone) {
    const known = Object.values(marks).filter((m) => m === "KNOWN").length;
    const review = Object.values(marks).filter((m) => m === "NEED_REVIEW").length;
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
        <p className="text-sm font-semibold text-emerald-900">✓ Cards reviewed</p>
        <p className="mt-0.5 text-[13px] text-emerald-800">
          {known} known · {review} scheduled for review. Words you marked for review will come back in your
          Vocabulary Review.
        </p>
      </div>
    );
  }

  const key = current.vocabularyId ?? current.word;

  return (
    <div>
      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? "Show the word side" : "Reveal the meaning"}
        className={cn(
          "flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-border bg-surface px-5 py-8 text-center shadow-card transition-colors hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
      >
        {!flipped ? (
          <>
            <p className="text-2xl font-semibold tracking-tight text-foreground" dir="auto">
              {current.word}
            </p>
            {current.phonetic && <p className="mt-1 text-sm text-muted">{current.phonetic}</p>}
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted/10 px-3 py-1 text-xs font-medium text-muted">
              <RotateCw className="h-3 w-3" aria-hidden /> Tap to flip
            </span>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-primary" dir="auto">
              {current.translation ?? "—"}
            </p>
            {current.example && (
              <p className="mt-2 max-w-xs text-[13px] italic leading-5 text-muted" dir="auto">
                “{current.example}”
              </p>
            )}
          </>
        )}
      </button>

      {flipped && (
        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            onClick={() => respond("NEED_REVIEW")}
            loading={busy}
            className="min-h-12"
            disabled={busy}
          >
            Review again
          </Button>
          <Button onClick={() => respond("KNOWN")} loading={busy} className="min-h-12" disabled={busy}>
            <Check className="h-4 w-4" aria-hidden /> I know it
          </Button>
        </div>
      )}

      {!flipped && (
        <p className="mt-3 text-center text-[13px] text-muted">
          Think of the meaning, then tap the card to check.
        </p>
      )}

      <p className="mt-3 text-center text-xs text-muted" aria-live="polite">
        {items.length - queue.length} of {items.length} cards done
      </p>

      {error && (
        <p role="alert" className="mt-2 text-center text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
