"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function AdminGamificationSettings() {
  const [lessonXp, setLessonXp] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  async function save(key: string, value: string) {
    setError(null);
    setDone(null);
    try {
      await apiFetch("/api/gamification/settings", { method: "POST", body: { key, value } });
      setDone(`${key} saved.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save.");
    }
  }
  return (
    <form className="mt-4 space-y-3 rounded-2xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); save("xp.lesson", lessonXp); }}>
      <h2 className="text-sm font-semibold">XP rules</h2>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm">{done}</p>}
      <label className="block text-xs text-muted">Lesson completion XP
        <input value={lessonXp} onChange={(event) => setLessonXp(event.target.value)} className="mt-1 h-11 w-28 rounded-lg border border-border px-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" type="submit">Save lesson XP</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("enabled", "true")}>Enable</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("enabled", "false")}>Disable</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("dailyXpCap", "80")}>Daily cap 80</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("xp.speaking", "15")}>Speaking 15</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("xp.vocabulary", "5")}>Vocabulary 5</Button>
        <Button className="h-11" type="button" variant="secondary" onClick={() => save("weeklyGoal", "4")}>Weekly goal 4</Button>
      </div>
      <div className="border-t border-border pt-3">
        <h3 className="text-sm font-semibold">Firefighter leopard reactions</h3>
        <p className="mt-1 text-xs text-muted">Reactions come only from recorded lesson/practice events, with a cooldown and daily cap. They never replace learning or grading decisions.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button className="h-10" type="button" variant="secondary" onClick={() => save("mascot.enabled", "true")}>Enable reactions</Button>
          <Button className="h-10" type="button" variant="secondary" onClick={() => save("mascot.enabled", "false")}>Disable reactions</Button>
          <Button className="h-10" type="button" variant="secondary" onClick={() => save("mascot.cooldownMinutes", "20")}>Cooldown · 20 min</Button>
          <Button className="h-10" type="button" variant="secondary" onClick={() => save("mascot.dailyLimit", "3")}>Max · 3 per day</Button>
        </div>
      </div>
    </form>
  );
}
