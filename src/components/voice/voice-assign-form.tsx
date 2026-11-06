"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function VoiceAssignForm({ groups, topics }: { groups: { id: string; name: string }[]; topics: { id: string; title: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (groups.length === 0) return null;
  return (
    <form
      className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        try {
          await apiFetch("/api/voice/assignments/speaking", {
            method: "POST",
            body: {
              title: String(data.get("title")),
              groupId: String(data.get("groupId")),
              topic: String(data.get("topic")),
              instructions: String(data.get("instructions") || ""),
              dueAt: new Date(String(data.get("dueAt"))).toISOString(),
              gradingMode: String(data.get("gradingMode")),
              publish: true,
            },
          });
          setDone(true);
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Could not assign speaking practice.");
        }
      }}
    >
      <h2 className="text-sm font-semibold">Assign speaking practice</h2>
      <p className="text-xs text-muted">Completion, teacher review, or AI feedback. AI feedback is not an official grade.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm">Assigned. Students were notified once.</p>}
      <input name="title" required placeholder="Title" className="h-11 w-full rounded-lg border border-border px-2" />
      <select name="groupId" className="h-11 w-full rounded-lg border border-border px-2">{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <select name="topic" className="h-11 w-full rounded-lg border border-border px-2">{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
      <select name="gradingMode" className="h-11 w-full rounded-lg border border-border px-2">
        <option value="COMPLETION">Completion only</option>
        <option value="TEACHER_REVIEW">Teacher review</option>
        <option value="AI_FEEDBACK">AI feedback only</option>
      </select>
      <textarea name="instructions" rows={2} placeholder="Instructions" className="w-full rounded-lg border border-border px-2 py-1" />
      <input name="dueAt" type="datetime-local" required className="h-11 w-full rounded-lg border border-border px-2" />
      <Button className="h-11" type="submit">Assign</Button>
    </form>
  );
}
