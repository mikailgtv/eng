"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function OverrideForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (groups.length === 0) return null;
  return (
    <form
      className="mt-4 space-y-2 rounded-2xl border border-border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        try {
          await apiFetch("/api/adaptive/overrides", {
            method: "POST",
            body: {
              groupId: String(data.get("groupId")),
              prioritySkill: String(data.get("prioritySkill")),
              requiredLabel: String(data.get("requiredLabel") || ""),
              note: String(data.get("note") || ""),
            },
          });
          setDone(true);
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Could not save the override.");
        }
      }}
    >
      <h2 className="text-sm font-semibold">Teacher override</h2>
      <p className="text-xs text-muted">This is respected in the next plan. It does not change grades or the work schedule.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm">Saved. Student plans update the next time they open the plan.</p>}
      <select name="groupId" className="h-11 w-full rounded-lg border border-border px-2">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      <select name="prioritySkill" className="h-11 w-full rounded-lg border border-border px-2">
        <option value="speaking">Speaking</option>
        <option value="grammar">Grammar</option>
        <option value="listening">Listening</option>
        <option value="vocabulary">Vocabulary</option>
        <option value="reading">Reading</option>
        <option value="writing">Writing</option>
      </select>
      <input name="requiredLabel" placeholder="Required review, for example Present Simple" className="h-11 w-full rounded-lg border border-border px-2" />
      <input name="note" placeholder="Short note for students" className="h-11 w-full rounded-lg border border-border px-2" />
      <Button className="h-11" type="submit">Save override</Button>
    </form>
  );
}
