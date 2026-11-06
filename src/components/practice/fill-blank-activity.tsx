"use client";

import { useState } from "react";
import { FeedbackBanner, type FeedbackState } from "@/components/practice/feedback-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface FillBlankActivityProps {
  sentenceWithBlank: string;
  options?: string[];
  initialText?: string | null;
  initialFeedback?: FeedbackState | null;
  locked?: boolean;
  onSubmit: (text: string) => Promise<FeedbackState>;
}

function renderSentence(sentence: string, filled: string | null) {
  const parts = sentence.split("___");
  return (
    <span className="text-[17px] leading-8 text-foreground sm:text-lg sm:leading-9" dir="auto">
      {parts[0]}
      <span
        aria-hidden
        className={cn(
          "mx-1 inline-block min-w-20 rounded-md border-b-2 px-2 text-center font-semibold",
          filled ? "border-primary text-primary" : "border-muted/50 text-muted"
        )}
      >
        {filled || "…"}
      </span>
      <span className="sr-only">{filled ? `Blank filled with: ${filled}` : "Blank to fill"}</span>
      {parts[1]}
    </span>
  );
}

/**
 * Fill-in-the-blank: type the word or pick from options when provided.
 * Comparison is normalized on the server ("AM" == "am"), never fuzzy.
 */
export function FillBlankActivity({
  sentenceWithBlank,
  options,
  initialText,
  initialFeedback,
  locked,
  onSubmit,
}: FillBlankActivityProps) {
  const [text, setText] = useState(initialText ?? "");
  const [feedback, setFeedback] = useState<FeedbackState | null>(initialFeedback ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = Boolean(locked) || feedback?.isCorrect === true;

  async function submit(value?: string) {
    const answer = (value ?? text).trim();
    if (!answer || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(answer);
      setFeedback(result);
    } catch {
      setError("Could not save your answer. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-medium">{renderSentence(sentenceWithBlank, isLocked ? null : text || null)}</p>

      {options && options.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {options.map((option) => {
            const active = text === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                disabled={isLocked}
                onClick={() => {
                  setText(option);
                  void submit(option);
                }}
                className={cn(
                  "min-h-11 rounded-xl border px-4 py-2.5 text-[15px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  active
                    ? "border-primary bg-primary-subtle/70 text-primary"
                    : "border-border bg-surface text-foreground hover:bg-muted/10",
                  isLocked && "cursor-default"
                )}
                dir="auto"
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          className="mt-3.5 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="fill-blank-input" className="sr-only">
            Your answer
          </label>
          <Input
            id="fill-blank-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLocked}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="sm:max-w-56"
            dir="auto"
          />
          {!isLocked && (
            <Button type="submit" disabled={!text.trim() || busy} loading={busy} className="min-h-11 shrink-0">
              {busy ? "Checking…" : "Check answer"}
            </Button>
          )}
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {feedback && (
        <div className="mt-3.5">
          <FeedbackBanner feedback={feedback} />
          {!feedback.isCorrect && (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setText("");
              }}
              className="mt-2 text-[13px] font-medium text-primary hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
