"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function SubmitAssignment({ assignmentId, initial }: { assignmentId: string; initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await apiFetch(`/api/teaching/assignments/${assignmentId}/submit`, { method: "POST", body: { text } });
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Could not submit.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <label htmlFor="answer" className="text-xs font-medium text-muted">Your answer</label>
      <textarea id="answer" value={text} onChange={(e) => setText(e.target.value)} required rows={6} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
      <Button type="submit" disabled={busy || !text.trim()}>Submit</Button>
    </form>
  );
}
