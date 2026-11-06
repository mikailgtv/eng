"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function AdminVoiceSettings() {
  const [minutes, setMinutes] = useState("15");
  const [error, setError] = useState<string | null>(null);
  async function save(key: string, value: string) {
    setError(null);
    try {
      await apiFetch("/api/voice/settings", { method: "POST", body: { scopeKey: "GLOBAL", key, value } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save.");
    }
  }
  return (
    <form className="mt-6 space-y-3 rounded-2xl border border-border p-4" onSubmit={(e) => { e.preventDefault(); save("dailyMinutes", minutes); }}>
      <h2 className="text-sm font-semibold">Voice settings</h2>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <label className="block text-xs text-muted">Maximum daily voice minutes
        <input value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1 h-11 w-28 rounded-lg border border-border px-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" type="submit">Save minutes</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("enabled", "true")}>Enable</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("enabled", "false")}>Disable</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("teacherTranscripts", "false")}>Hide transcripts from teachers</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("monthlyMinutes", "120")}>Monthly cap 120</Button>
      </div>
    </form>
  );
}
