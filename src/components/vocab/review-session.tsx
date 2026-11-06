"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashcardActivity } from "@/components/practice/flashcard-activity";
import { apiFetch } from "@/lib/client-api";
import type { VocabReviewItem } from "@/lib/practice";

/** Format next due for learner feedback — deterministic UTC, e.g. “in 3 days (28 Oct)” or “tomorrow”. */
function formatNextDue(dueAt: string | Date): string {
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "later today";
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days (${due.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })})`;
}

/**
 * Vocabulary Review session: flashcards over the words currently due
 * (scheduled by the review system). Self-assessment feeds the scheduler —
 * "I know it" is never treated as permanent mastery.
 */
export function ReviewSession({ initialItems, upcomingCount }: { initialItems: VocabReviewItem[]; upcomingCount?: number }) {
  const [items, setItems] = useState(initialItems);
  const [upcoming, setUpcoming] = useState(upcomingCount ?? 0);
  const [reloadError, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function refreshMore() {
    setError(null);
    try {
      const data = await apiFetch<{ items: VocabReviewItem[]; upcomingCount?: number }>("/api/vocabulary/review?upcoming=1");
      // support both shapes: {items} and {items, upcomingCount}
      const nextItems = (data as { items: VocabReviewItem[] }).items ?? [];
      setItems(nextItems);
      const serverUpcoming = (data as { upcomingCount?: number }).upcomingCount;
      if (typeof serverUpcoming === "number") setUpcoming(serverUpcoming);
    } catch {
      setError("Could not load more words. Please try again.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <BookOpenCheck className="h-6 w-6 text-emerald-600" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-foreground">Nothing to review right now.</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">
          You are all caught up! Words come back here when they are scheduled for review — keep practicing your
          lessons.
        </p>
        {upcoming > 0 && (
          <p className="mt-2 text-xs text-muted">{upcoming} word{upcoming === 1 ? "" : "s"} scheduled for later — not due yet.</p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/student/learning">
            <Button variant="secondary" size="sm">Go to My Learning</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={refreshMore} className="min-h-11">
            <Plus className="h-4 w-4" aria-hidden /> Check again
          </Button>
        </div>
        {feedback && <p role="status" className="mt-3 text-[13px] text-emerald-800">{feedback}</p>}
        {reloadError && <p role="alert" className="mt-2 text-[13px] text-danger">{reloadError}</p>}
      </div>
    );
  }

  return (
    <div>
      {items.length > 0 && <p className="mb-3 text-center text-xs text-muted">{items.length} due now{` · ${upcoming} scheduled later`}</p>}
      {feedback && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-[13px] text-emerald-800">{feedback}</p>}
      <FlashcardActivity
        items={items.map((it) => ({
          vocabularyId: it.vocabularyId,
          word: it.word,
          translation: it.translation ?? undefined,
          phonetic: it.phonetic ?? undefined,
          example: it.example ?? undefined,
        }))}
        onSubmit={async (marks) => {
          const lastUpcoming: number | null = null;
          for (const mark of marks) {
            if (mark.vocabularyId) {
              const res = await apiFetch<{ status: string; dueAt: string; streak: number }>("/api/vocabulary/review", {
                method: "POST",
                body: { vocabularyId: mark.vocabularyId, response: mark.response },
              });
              setFeedback(`${mark.word}: ${mark.response === "KNOWN" ? "Known" : "To review"} — next ${formatNextDue(res.dueAt)} (streak ${res.streak})`);
              // Optimistic: reviewed card leaves due queue and joins scheduled-later — header stays authoritative.
              setItems((prev) => prev.filter((it) => it.vocabularyId !== mark.vocabularyId));
              setUpcoming((prev) => prev + 1);
              // Fire-and-forget server re-sync of upcoming count to avoid drift.
              apiFetch<{ upcomingCount?: number; upcoming?: unknown[] }>("/api/vocabulary/review?upcoming=1").then((d) => {
                const n = (d as { upcomingCount?: number }).upcomingCount ?? (Array.isArray((d as { upcoming?: unknown[] }).upcoming) ? (d as { upcoming: unknown[] }).upcoming.length : null);
                if (typeof n === "number") setUpcoming(n);
              }).catch(() => { /* non-fatal */ });
            }
          }
        }}
      />
      <p className="mt-4 text-center text-xs text-muted">
        Words you mark “Review again” are scheduled to come back tomorrow. This is simple review practice — not an
        exam.
      </p>
    </div>
  );
}
