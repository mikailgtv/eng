"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Route-level error boundary — never exposes raw server errors to users. */
export default function GlobalErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          An unexpected error occurred. The issue has been logged — please try again.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
        {process.env.NODE_ENV !== "production" && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-muted/10 p-3 text-left text-[11px] text-muted">
            {error.message}
          </pre>
        )}
      </div>
    </main>
  );
}
