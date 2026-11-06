"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";

export function DeleteTranscriptButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      className="mt-2"
      variant="secondary"
      onClick={async () => {
        if (!confirm("Delete the recognized text for this session? The recording was not stored.")) return;
        await apiFetch(`/api/voice/sessions/${id}/delete`, { method: "POST" });
        router.refresh();
      }}
    >
      Delete text
    </Button>
  );
}
