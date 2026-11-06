"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/teaching/submissions/${submissionId}/review`, {
        method: "POST",
        body: { feedback: feedback || null, score: score === "" ? null : Number(score) },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2">
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <label className="block text-xs text-muted">Feedback
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs text-muted">Score (0–100, optional)
        <input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" className="mt-1 w-24 rounded-lg border border-border px-2 py-1.5 text-sm" />
      </label>
      <Button type="submit" disabled={busy}>Mark reviewed</Button>
    </form>
  );
}

export function PublishAssignmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
      <Button
        onClick={async () => {
          if (!confirm("Publish this assignment and notify the group?")) return;
          try {
            await apiFetch(`/api/teaching/assignments/${id}`, { method: "POST" });
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not publish.");
          }
        }}
      >
        Publish assignment
      </Button>
    </div>
  );
}
