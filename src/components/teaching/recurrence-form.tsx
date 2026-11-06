"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RecurrenceForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (groups.length === 0) return null;
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>Add a weekly rule</Button>;

  return (
    <form
      className="space-y-3 rounded-2xl border border-border bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          await apiFetch("/api/teaching/recurrence", {
            method: "POST",
            body: {
              groupId: String(data.get("groupId")),
              title: String(data.get("title")),
              dayOfWeek: Number(data.get("dayOfWeek")),
              startTime: String(data.get("startTime")),
              endTime: String(data.get("endTime")),
              generate: true,
            },
          });
          setOpen(false);
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Could not save the rule.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-muted">Weekly times are UTC. The next four occurrences are created. Past times are skipped.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <label className="block text-xs text-muted">Group
        <select name="groupId" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm">{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      </label>
      <label className="block text-xs text-muted">Title
        <input name="title" required className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs text-muted">Day
        <select name="dayOfWeek" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm">{DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}</select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Starts
          <input name="startTime" type="time" required defaultValue="09:00" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">Ends
          <input name="endTime" type="time" required defaultValue="10:00" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>Save rule</Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
