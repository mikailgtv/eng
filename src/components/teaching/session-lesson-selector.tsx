"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

type LessonOption = { id: string; title: string; moduleTitle: string; courseTitle: string; levelLabel: string };

export function SessionLessonSelector({
  sessionId,
  selectedLessonId,
  lessons,
  disabled,
}: {
  sessionId: string;
  selectedLessonId: string | null;
  lessons: LessonOption[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState(selectedLessonId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!lessonId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/teaching/sessions/${sessionId}`, {
        method: "POST",
        body: { action: "lesson", lessonId },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not select this lesson.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="lesson-selection" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="lesson-selection" className="text-[15px] font-semibold">Lesson delivered</h2>
      <p className="mt-1 text-xs text-muted">Choose a published lesson from a course assigned to this class. Selection is saved to the session record.</p>
      {lessons.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No published lessons are available in courses assigned to this class.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="session-lesson">Lesson</label>
          <select
            id="session-lesson"
            value={lessonId}
            disabled={disabled || busy}
            onChange={(event) => setLessonId(event.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Select a lesson…</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.levelLabel} · {lesson.courseTitle} · {lesson.moduleTitle} · {lesson.title}
              </option>
            ))}
          </select>
          <Button disabled={disabled || busy || !lessonId || lessonId === selectedLessonId} onClick={save}>
            {busy ? "Saving…" : selectedLessonId === lessonId ? "Selected" : "Save lesson"}
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
