"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function PlanForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (groups.length === 0) return null;
  return (
    <form
      className="grid gap-2 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          await apiFetch("/api/teaching/plans", {
            method: "POST",
            body: {
              groupId: String(data.get("groupId")),
              plannedDate: new Date(String(data.get("plannedDate"))).toISOString(),
              plannedDurationMin: Number(data.get("duration") || 60),
              notes: String(data.get("notes") || "") || null,
            },
          });
          router.refresh();
          e.currentTarget.reset();
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Could not save the plan.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
      <label className="text-xs text-muted">Group
        <select name="groupId" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm">{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      </label>
      <label className="text-xs text-muted">Planned date
        <input name="plannedDate" type="datetime-local" required className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs text-muted">Minutes
        <input name="duration" type="number" min={15} max={240} defaultValue={60} className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs text-muted">Notes
        <input name="notes" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <Button type="submit" disabled={busy} className="sm:col-span-2 sm:w-fit">Add to plan</Button>
    </form>
  );
}

export function PlanStatusButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button className="mt-2" variant="secondary" onClick={async () => {
      await apiFetch(`/api/teaching/plans/${id}`, { method: "PATCH", body: { status: "COMPLETED" } });
      router.refresh();
    }}>Mark completed</Button>
  );
}
