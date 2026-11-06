"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function TeacherAiControls({
  groups,
  items,
}: {
  groups: { id: string; name: string }[];
  items: { id: string; prompt: string; answer: string | null; status: string; lesson: string; student: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  async function save(key: string, value: string) {
    setError(null);
    try {
      await apiFetch("/api/ai/settings", { method: "POST", body: { scopeKey: groupId, key, value } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save.");
    }
  }

  async function review(itemId: string, action: "approve" | "reject" | "publish") {
    if (action === "publish" && !confirm("Add this approved AI Practice item to the lesson? Students will see it as practice, not an exam.")) return;
    setError(null);
    try {
      await apiFetch("/api/ai/review", { method: "POST", body: { itemId, action } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update the item.");
    }
  }

  return (
    <div className="mt-4 space-y-6">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {groups.length === 0 ? <p className="text-sm text-muted">No groups assigned.</p> : (
        <form className="space-y-3 rounded-2xl border border-border bg-surface p-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-xs text-muted">Group
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => save("enabled", "true")}>Enable tutor</Button>
            <Button type="button" variant="secondary" onClick={() => save("enabled", "false")}>Disable tutor</Button>
            <Button type="button" variant="secondary" onClick={() => save("conversationEnabled", "false")}>Turn off conversation</Button>
            <Button type="button" variant="secondary" onClick={() => save("translationEnabled", "true")}>Allow translation hints</Button>
            <Button type="button" variant="secondary" onClick={() => save("defaultDifficulty", "EASY")}>Default Easy</Button>
          </div>
        </form>
      )}
      <section>
        <h2 className="text-sm font-semibold">AI Practice awaiting review</h2>
        <p className="mb-2 text-xs text-muted">Draft items are not exams and are not visible to students until you publish them.</p>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-border px-3 py-2 text-sm">
              <p className="font-medium">{item.prompt}</p>
              <p className="text-xs text-muted">{item.lesson} · {item.status} · answer {item.answer ?? "—"} · student first name only</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.status === "DRAFT" && <Button onClick={() => review(item.id, "approve")}>Approve</Button>}
                {item.status !== "PUBLISHED" && <Button variant="secondary" onClick={() => review(item.id, "reject")}>Reject</Button>}
                {item.status === "APPROVED" && <Button onClick={() => review(item.id, "publish")}>Publish to lesson</Button>}
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted">No generated practice yet.</li>}
        </ul>
      </section>
    </div>
  );
}
