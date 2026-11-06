"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function CreateLessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>("/api/teaching/lessons", { method: "POST", body: { moduleId, title } });
      router.push(`/teacher/courses/lessons/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create the lesson.");
      setBusy(false);
    }
  }

  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>Create lesson</Button>;
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={`lesson-${moduleId}`} className="text-xs text-muted">Draft lesson title</label>
        <input id={`lesson-${moduleId}`} value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 rounded-lg border border-border px-2 py-1.5 text-sm" />
      </div>
      <Button type="submit" disabled={busy}>Save draft</Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </form>
  );
}
