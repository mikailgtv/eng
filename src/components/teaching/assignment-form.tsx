"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function AssignmentForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>("/api/teaching/assignments", {
        method: "POST",
        body: {
          title: String(data.get("title")),
          description: String(data.get("description") || "") || null,
          instructions: String(data.get("instructions") || "") || null,
          type: String(data.get("type")),
          groupId: String(data.get("groupId")),
          dueAt: new Date(String(data.get("dueAt"))).toISOString(),
          status: data.get("publish") === "on" ? "PUBLISHED" : "DRAFT",
          allowLate: data.get("allowLate") === "on",
        },
      });
      router.push(`/teacher/assignments/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create the assignment.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Field label="Title" name="title" required />
      <label className="block text-xs text-muted">Group
        <select name="groupId" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground">
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </label>
      <label className="block text-xs text-muted">Type
        <select name="type" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground">
          <option value="PRACTICE">Practice</option>
          <option value="WRITTEN">Written</option>
          <option value="VOCABULARY">Vocabulary</option>
          <option value="READING">Reading</option>
        </select>
      </label>
      <Field label="Description" name="description" />
      <Field label="Instructions" name="instructions" />
      <label className="block text-xs text-muted">Due
        <input name="dueAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowLate" /> Allow late submissions</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" /> Publish now and notify students</label>
      <Button type="submit" disabled={busy || groups.length === 0}>Save assignment</Button>
    </form>
  );
}

function Field({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="block text-xs text-muted">{label}
      <textarea name={name} required={required} rows={name === "title" ? 1 : 3} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
    </label>
  );
}
