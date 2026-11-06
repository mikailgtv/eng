"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ScheduleForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const start = new Date(String(data.get("start")));
      const end = new Date(String(data.get("end")));
      await apiFetch("/api/teaching/sessions", {
        method: "POST",
        body: {
          groupId: String(data.get("groupId")),
          title: String(data.get("title")),
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not schedule the class.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Schedule a class</Button>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div>
        <label htmlFor="sched-group" className="text-xs font-medium text-muted">Group</label>
        <select id="sched-group" name="groupId" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="sched-title" className="text-xs font-medium text-muted">Title</label>
        <input id="sched-title" name="title" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="sched-start" className="text-xs font-medium text-muted">Starts</label>
          <input id="sched-start" name="start" type="datetime-local" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="sched-end" className="text-xs font-medium text-muted">Ends</label>
          <input id="sched-end" name="end" type="datetime-local" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>Save class</Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
