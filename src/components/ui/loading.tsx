import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5 animate-spin text-primary", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Full-page loading state for route-level loading.tsx files. */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="page-container flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Spinner className="h-6 w-6" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/** Skeleton block for list/table placeholders. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/15", className)} aria-hidden />;
}
