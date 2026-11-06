"use client";

import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function SupportBanner({ active }: { active: boolean }) {
  const [message, setMessage] = useState("");
  if (!active) return null;
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950" role="status">
      You are viewing as another user. Actions are recorded as support access.
      <button
        className="ml-3 underline"
        type="button"
        onClick={async () => {
          try {
            const result = await apiFetch<{ redirect?: string }>("/api/security/impersonate", { method: "POST", body: { action: "end" } });
            window.location.href = result.redirect ?? "/admin";
          } catch (err) {
            setMessage(err instanceof ApiClientError ? err.message : "Could not end support access.");
          }
        }}
      >
        End support access
      </button>
      {message ? <span className="ml-2">{message}</span> : null}
    </div>
  );
}
