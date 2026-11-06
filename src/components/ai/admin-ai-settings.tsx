"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function AdminAiSettings() {
  const [limit, setLimit] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(key: string, value: string) {
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/api/ai/settings", { method: "POST", body: { scopeKey: "GLOBAL", key, value } });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save.");
    }
  }

  return (
    <form className="mt-6 space-y-3 rounded-2xl border border-border bg-surface p-4" onSubmit={(e) => { e.preventDefault(); save("dailyRequestLimit", limit); }}>
      <h2 className="text-sm font-semibold">Organization settings</h2>
      <p className="text-xs text-muted">The model and provider credential stay in the server environment. This form cannot set them.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-muted">Saved.</p>}
      <label className="block text-xs text-muted">Daily request limit
        <input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" className="mt-1 w-28 rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save limit</Button>
        <Button type="button" variant="secondary" onClick={() => save("enabled", "true")}>Enable tutor</Button>
        <Button type="button" variant="secondary" onClick={() => save("enabled", "false")}>Disable tutor</Button>
        <Button type="button" variant="secondary" onClick={() => save("maxResponseChars", "800")}>Max reply 800</Button>
        <Button type="button" variant="secondary" onClick={() => save("translationEnabled", "true")}>Allow translation hints</Button>
      </div>
    </form>
  );
}
