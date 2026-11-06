"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ListeningAssignForm({ groups, exercises }: { groups: { id: string; name: string }[]; exercises: { id: string; title: string; topic: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (groups.length === 0 || exercises.length === 0) return <p className="mt-4 text-sm text-muted">No group or published listening practice is available.</p>;
  return (
    <form
      className="mt-4 space-y-2 rounded-2xl border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        try {
          await apiFetch("/api/voice/assignments/listening", {
            method: "POST",
            body: {
              title: String(data.get("title")),
              groupId: String(data.get("groupId")),
              exerciseId: String(data.get("exerciseId")),
              dueAt: new Date(String(data.get("dueAt"))).toISOString(),
              publish: true,
            },
          });
          setDone(true);
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Could not assign listening practice.");
        }
      }}
    >
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm">Assigned.</p>}
      <input name="title" required placeholder="Title" className="h-11 w-full rounded-lg border border-border px-2" />
      <select name="groupId" className="h-11 w-full rounded-lg border border-border px-2">{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <select name="exerciseId" className="h-11 w-full rounded-lg border border-border px-2">{exercises.map((item) => <option key={item.id} value={item.id}>{item.topic}: {item.title}</option>)}</select>
      <input name="dueAt" type="datetime-local" required className="h-11 w-full rounded-lg border border-border px-2" />
      <Button className="h-11" type="submit">Assign listening</Button>
    </form>
  );
}
