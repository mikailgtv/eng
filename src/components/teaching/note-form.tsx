"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function NoteForm({
  scope,
  studentId,
  groupId,
  sessionId,
}: {
  scope: "STUDENT" | "GROUP" | "SESSION";
  studentId?: string;
  groupId?: string;
  sessionId?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/teaching/notes", { method: "POST", body: { scope, studentId, groupId, sessionId, content } });
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <label htmlFor={`note-${scope}`} className="text-xs font-medium text-muted">Private teacher note</label>
      <textarea
        id={`note-${scope}`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={3}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
      <Button type="submit" disabled={busy || !content.trim()}>Save note</Button>
    </form>
  );
}
