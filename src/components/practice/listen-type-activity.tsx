"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { AudioPlayer } from "@/components/practice/audio-player";
import { FeedbackBanner, type FeedbackState } from "@/components/practice/feedback-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export interface ListenTypeActivityProps {
  audioUrl: string | null;
  /** Accessibility fallback when audio is missing (practice context). */
  transcriptFallback?: string | null;
  initialText?: string | null;
  initialFeedback?: FeedbackState | null;
  locked?: boolean;
  onSubmit: (text: string) => Promise<FeedbackState>;
}

/**
 * Listen-and-type: play the audio (reusable player), then type the sentence.
 * Comparison is normalized server-side (case, spaces, punctuation tails).
 */
export function ListenTypeActivity({
  audioUrl,
  transcriptFallback,
  initialText,
  initialFeedback,
  locked,
  onSubmit,
}: ListenTypeActivityProps) {
  const [text, setText] = useState(initialText ?? "");
  const [feedback, setFeedback] = useState<FeedbackState | null>(initialFeedback ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);

  const isLocked = Boolean(locked) || feedback?.isCorrect === true;

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(text);
      setFeedback(result);
    } catch {
      setError("Could not save your answer. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {audioUrl ? (
        <AudioPlayer src={audioUrl} label="Listening audio" />
      ) : transcriptFallback ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <p role="status" className="text-sm font-medium text-amber-900">
            Audio is not available yet.
          </p>
          {showText ? (
            <p className="mt-1.5 text-[15px] text-amber-900" dir="auto">
              “{transcriptFallback}”
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowText(true)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-900 underline"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden /> Show the text instead
            </button>
          )}
        </div>
      ) : (
        <p role="status" className="rounded-lg bg-muted/10 px-3 py-2 text-[13px] text-muted">
          Audio is not available yet.
        </p>
      )}

      <form
        className="mt-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="listen-type-input" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Type what you hear
        </label>
        <Textarea
          id="listen-type-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLocked}
          rows={2}
          autoComplete="off"
          spellCheck={false}
          dir="auto"
        />
        {!isLocked && (
          <div className="mt-3 flex items-center gap-2">
            <Button type="submit" disabled={!text.trim() || busy} loading={busy} className="min-h-11">
              {busy ? "Checking…" : "Check answer"}
            </Button>
            {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
          </div>
        )}
      </form>

      {feedback && (
        <div className="mt-3.5">
          <FeedbackBanner feedback={feedback} />
          {feedback.isCorrect === false && (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
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
