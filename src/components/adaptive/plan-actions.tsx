"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function PlanActions({ items }: { items: { recommendationId: string; title: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState("10");
  const [goal, setGoal] = useState("I want to speak more.");
  return (
    <div className="mt-4 space-y-3">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.recommendationId}>
            <Button
              className="h-11"
              variant="secondary"
              onClick={async () => {
                setError(null);
                try {
                  await apiFetch(`/api/adaptive/recommendations/${item.recommendationId}/done`, { method: "POST" });
                  router.refresh();
                } catch (err) {
                  setError(err instanceof ApiClientError ? err.message : "Could not update the plan.");
                }
              }}
            >
              Mark “{item.title}” done
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          try {
            await apiFetch("/api/adaptive/preferences", { method: "POST", body: { minutes: Number(minutes) } });
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not save minutes.");
          }
        }}
      >
        <label className="text-sm text-muted">Daily minutes
          <select value={minutes} onChange={(event) => setMinutes(event.target.value)} className="ml-2 h-11 rounded-lg border border-border px-2">
            {[5, 10, 15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <Button className="h-11" type="submit">Save time</Button>
      </form>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          try {
            await apiFetch("/api/adaptive/goals", { method: "POST", body: { text: goal, skillCode: "speaking" } });
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not save the goal.");
          }
        }}
      >
        <label className="min-w-0 flex-1 text-sm text-muted">Optional goal
          <input value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border px-2" />
        </label>
        <Button className="h-11 self-end" type="submit">Save goal</Button>
      </form>
      <Button className="h-11" variant="secondary" onClick={async () => {
        await apiFetch("/api/adaptive/plan/refresh", { method: "POST" });
        router.refresh();
      }}>Update my plan</Button>
    </div>
  );
}
