"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function AdminAdaptiveSettings() {
  const [intervals, setIntervals] = useState("1,2,4,8,16");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  async function save(key: string, value: string) {
    setError(null);
    setDone(null);
    try {
      await apiFetch("/api/adaptive/settings", { method: "POST", body: { key, value } });
      setDone(`${key} saved.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save.");
    }
  }
  return (
    <form className="mt-4 space-y-3 rounded-2xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); save("reviewIntervals", intervals); }}>
      <h2 className="text-sm font-semibold">Adaptive settings</h2>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm">{done}</p>}
      <label className="block text-xs text-muted">Review intervals, in days
        <input value={intervals} onChange={(event) => setIntervals(event.target.value)} className="mt-1 h-11 w-full max-w-xs rounded-lg border border-border px-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" type="submit">Save intervals</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("enabled", "true")}>Enable</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("enabled", "false")}>Disable</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("dailyMinutes", "10")}>Default 10 minutes</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("maxRecommendations", "4")}>Max 4 recommendations</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("teacherOverride", "true")}>Teacher override on</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={async () => {
          setError(null);
          try {
            const result = await apiFetch<{ excluded: number }>("/api/adaptive/retention", { method: "POST" });
            setDone(`Retention applied. ${result.excluded} old events excluded from estimates.`);
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not apply retention.");
          }
        }}>Apply retention</Button>
      </div>
    </form>
  );
}
