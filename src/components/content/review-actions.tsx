"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ReviewActions({ lessonId, admin }: { lessonId: string; admin: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  async function run(body: Record<string, unknown>) {
    try {
      await apiFetch("/api/content/lessons", { method: "POST", body: { lessonId, ...body } });
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : "Not saved.");
    }
  }
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      {admin && (
        <>
          <Button type="button" className="h-11" onClick={() => run({ action: "review", status: "APPROVED" })}>Approve</Button>
          <input className="h-11 rounded-lg border border-border px-2" placeholder="Reason if rejecting" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button type="button" variant="secondary" className="h-11" onClick={() => run({ action: "review", status: "REJECTED", reason })}>Reject</Button>
          <Button type="button" className="h-11" onClick={() => { if (!confirm("Publish this lesson?")) return; void run({ action: "publish", confirm: true }); }}>Publish</Button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
