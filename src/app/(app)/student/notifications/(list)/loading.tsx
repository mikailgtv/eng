import { Skeleton } from "@/components/ui/loading";

/**
 * Loading UI for /student/notifications only.
 *
 * Scoped with a `(list)` route group so the boundary does not also wrap
 * `student/notifications/preferences`, which has a different layout and needs no
 * notification-shaped skeleton.
 *
 * Mirrors the real page: title, summary line, two filter rows, then the notice
 * cards.
 */
export default function NotificationsListLoading() {
  return (
    <div className="mx-auto w-full max-w-lg" aria-busy="true">
      <span className="sr-only">Loading notifications…</span>

      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />

      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, chip) => (
          <Skeleton key={chip} className="h-4 w-16" />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, chip) => (
          <Skeleton key={chip} className="h-4 w-24" />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, card) => (
          <div key={card} className="rounded-2xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
