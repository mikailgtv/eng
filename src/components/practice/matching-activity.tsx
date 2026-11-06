"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { FeedbackBanner, type FeedbackState } from "@/components/practice/feedback-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MatchingActivityProps {
  lefts: string[];
  rights: string[];
  instruction?: string;
  initialPairs?: { left: string; right: string }[] | null;
  initialFeedback?: FeedbackState | null;
  locked?: boolean;
  onSubmit: (pairs: { left: string; right: string }[]) => Promise<FeedbackState>;
}

/**
 * Matching exercise for touch: tap an item on the left, then its partner on
 * the right. Pairs appear connected with a badge; a pair can be undone.
 * Screen-reader friendly: selections are announced via aria-pressed labels.
 */
export function MatchingActivity({ lefts, rights, instruction, initialPairs, initialFeedback, locked, onSubmit }: MatchingActivityProps) {
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>(initialPairs ?? []);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(initialFeedback ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = Boolean(locked) || feedback?.isCorrect === true;
  const rightByLeft = new Map(pairs.map((p) => [p.left, p.right]));
  const usedRights = new Set(pairs.map((p) => p.right));

  function onLeftTap(left: string) {
    if (isLocked) return;
    if (rightByLeft.has(left)) {
      // undo the pair
      setPairs((p) => p.filter((x) => x.left !== left));
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(left === selectedLeft ? null : left);
  }

  function onRightTap(right: string) {
    if (isLocked || !selectedLeft) return;
    setPairs((p) => [...p.filter((x) => x.left !== selectedLeft), { left: selectedLeft, right }]);
    setSelectedLeft(null);
  }

  async function submit() {
    if (pairs.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(pairs);
      setFeedback(result);
    } catch {
      setError("Could not save your answer. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const allMatched = pairs.length === lefts.length;

  return (
    <div>
      {instruction && <p className="mb-3 text-[13px] text-muted">{instruction}</p>}
      {selectedLeft && (
        <p role="status" className="mb-3 rounded-lg bg-primary-subtle/60 px-3 py-2 text-[13px] font-medium text-primary">
          Selected: <span dir="auto">{selectedLeft}</span> — now tap its match.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div role="group" aria-label="First column" className="grid content-start gap-2">
          {lefts.map((left) => {
            const matched = rightByLeft.get(left);
            const active = selectedLeft === left;
            return (
              <button
                key={left}
                type="button"
                onClick={() => onLeftTap(left)}
                disabled={isLocked}
                aria-pressed={active}
                aria-label={matched ? `${left}, matched with ${matched}. Tap to undo.` : `Select ${left}`}
                className={cn(
                  "flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  active
                    ? "border-primary bg-primary-subtle text-primary"
                    : matched
                      ? "border-border bg-muted/10 text-foreground"
                      : "border-border bg-surface text-foreground hover:bg-muted/10",
                  isLocked && "cursor-default"
                )}
                dir="auto"
              >
                <span className="min-w-0 flex-1 truncate">{left}</span>
                {matched && (
                  <span aria-hidden className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                    {matched}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Second column" className="grid content-start gap-2">
          {rights.map((right) => {
            const used = usedRights.has(right);
            return (
              <button
                key={right}
                type="button"
                onClick={() => onRightTap(right)}
                disabled={isLocked || (!selectedLeft && !isLocked)}
                aria-label={used ? `${right} (already used)` : `Match with ${right}`}
                className={cn(
                  "flex min-h-12 w-full items-center rounded-xl border px-3 py-2.5 text-left text-[15px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  used
                    ? "border-border bg-muted/10 text-muted"
                    : "border-border bg-surface text-foreground hover:bg-primary-subtle/50",
                  (isLocked || !selectedLeft) && "cursor-default"
                )}
                dir="auto"
              >
                <span className="min-w-0 flex-1 truncate" dir="auto">{right}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isLocked && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={submit} disabled={!allMatched || busy} loading={busy} className="min-h-11">
            <Link2 className="h-4 w-4" aria-hidden />
            {busy ? "Checking…" : "Check answers"}
          </Button>
          {!allMatched && pairs.length > 0 && (
            <span className="text-[13px] text-muted">
              {lefts.length - pairs.length} pair{lefts.length - pairs.length === 1 ? "" : "s"} left
            </span>
          )}
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        </div>
      )}

      {feedback && (
        <div className="mt-4">
          <FeedbackBanner feedback={feedback} />
          {feedback.isCorrect === false && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPairs([]);
                  setFeedback(null);
                  setSelectedLeft(null);
                }}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Try again
              </button>
              {feedback.correctText && (
                <p className="text-[13px] text-muted">
                  First fix: <span className="font-medium text-foreground" dir="auto">{feedback.correctText}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
