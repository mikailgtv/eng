"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/client-api";

/**
 * Fire-and-forget activity tracking: marks the lesson accessed when the
 * student actually opens it (client-side, so link prefetching doesn't create
 * phantom activity). Errors are intentionally swallowed — tracking must
 * never break the lesson.
 */
export function LessonAccessTracker({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    apiFetch(`/api/lessons/${lessonId}/access`, { method: "POST", body: {} }).catch(() => undefined);
  }, [lessonId]);
  return null;
}
