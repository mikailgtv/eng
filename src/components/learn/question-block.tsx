"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface QuestionBlockProps {
  index: number;
  prompt: string;
  answer: string;
  hint?: string;
}

/**
 * Practice question (self-check): the student answers out loud or in their
 * head, then reveals the model answer. Real, honest practice — not a graded
 * quiz (that belongs to a later phase).
 */
export function QuestionBlock({ index, prompt, answer, hint }: QuestionBlockProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <p className="text-[13px] font-medium uppercase tracking-wide text-muted">
        Question {index}
      </p>
      <p className="mt-1.5 text-[15px] font-medium leading-7 text-foreground">{prompt}</p>
      {hint && !revealed && (
        <p className="mt-1.5 text-[13px] italic text-muted">Hint: {hint}</p>
      )}
      <div className="mt-3">
        {revealed ? (
          <p
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[15px] font-medium text-emerald-900"
            role="status"
          >
            {answer}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-expanded={false}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/10"
          >
            <Eye className="h-4 w-4 text-muted" aria-hidden /> Show answer
          </button>
        )}
      </div>
    </div>
  );
}
