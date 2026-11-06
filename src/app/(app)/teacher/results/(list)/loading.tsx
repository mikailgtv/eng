import { Skeleton } from "@/components/ui/loading";

/**
 * Loading UI for /teacher/results only.
 *
 * Same reason as the users list: a `loading.tsx` at `teacher/results/` would
 * also wrap `teacher/results/[attemptId]`, whose error/500 path must keep its
 * real status instead of being flushed as a soft 200. The `(list)` group scopes
 * the boundary to this page.
 *
 * Mirrors the real page's header, search box and six-column filter row so the
 * layout does not shift when the rows arrive.
 */
export default function ResultsListLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl" aria-busy="true">
      <span className="sr-only">Loading assessment results…</span>

      <div className="mb-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <Skeleton className="mb-3 h-10 w-full sm:max-w-xs" />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, cell) => (
          <Skeleton key={cell} className={cell === 1 ? "h-10 sm:col-span-2" : "h-10"} />
        ))}
      </div>

      <div className="rounded-xl border border-border p-3">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-3 px-1 py-3">
            <Skeleton className="h-4 w-32 shrink-0" />
            <Skeleton className="hidden h-4 flex-1 md:block" />
            <Skeleton className="hidden h-4 w-20 shrink-0 md:block" />
            <Skeleton className="h-4 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
