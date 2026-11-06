"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ChallengeForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (groups.length === 0) return null;
  return (
    <div className="mt-4 space-y-4">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm">{done}</p>}
      <form
        className="space-y-2 rounded-2xl border border-border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError(null);
          try {
            await apiFetch("/api/gamification/challenges", {
              method: "POST",
              body: {
                title: String(data.get("title")),
                groupId: String(data.get("groupId")),
                requirementType: String(data.get("requirementType")),
                requirementCount: Number(data.get("requirementCount")),
                endAt: new Date(String(data.get("endAt"))).toISOString(),
                xpReward: 10,
              },
            });
            setDone("Challenge assigned. Students were notified once.");
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not create the challenge.");
          }
        }}
      >
        <h2 className="text-sm font-semibold">Assign a challenge</h2>
        <p className="text-xs text-muted">Individual progress stays private. This does not change a grade.</p>
        <input name="title" required placeholder="Title" className="h-11 w-full rounded-lg border border-border px-2" />
        <select name="groupId" className="h-11 w-full rounded-lg border border-border px-2">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
        <select name="requirementType" className="h-11 w-full rounded-lg border border-border px-2">
          <option value="SPEAKING_COMPLETED">Speaking sessions</option>
          <option value="LISTENING_COMPLETED">Listening activities</option>
          <option value="VOCABULARY_CORRECT">Vocabulary reviews</option>
          <option value="LESSON_COMPLETED">Lessons</option>
          <option value="ANY">Any finished activity</option>
        </select>
        <input name="requirementCount" type="number" min={1} max={20} defaultValue={3} className="h-11 w-28 rounded-lg border border-border px-2" />
        <input name="endAt" type="datetime-local" required className="h-11 w-full rounded-lg border border-border px-2" />
        <Button className="h-11" type="submit">Assign</Button>
      </form>
      <form
        className="space-y-2 rounded-2xl border border-border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError(null);
          try {
            await apiFetch("/api/gamification/group-challenges", {
              method: "POST",
              body: {
                title: String(data.get("title")),
                groupId: String(data.get("groupId")),
                requirementCount: Number(data.get("requirementCount")),
                endAt: new Date(String(data.get("endAt"))).toISOString(),
              },
            });
            setDone("Group challenge saved. Only the group total is shown.");
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not create the group challenge.");
          }
        }}
      >
        <h2 className="text-sm font-semibold">Group total</h2>
        <p className="text-xs text-muted">Shows a shared total only. No student names and no ranking.</p>
        <input name="title" required placeholder="Together complete learning activities" className="h-11 w-full rounded-lg border border-border px-2" />
        <select name="groupId" className="h-11 w-full rounded-lg border border-border px-2">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
        <input name="requirementCount" type="number" min={1} max={500} defaultValue={20} className="h-11 w-28 rounded-lg border border-border px-2" />
        <input name="endAt" type="datetime-local" required className="h-11 w-full rounded-lg border border-border px-2" />
        <Button className="h-11" type="submit">Save group total</Button>
      </form>
    </div>
  );
}
