import { Skeleton } from "@/components/ui/loading";

/**
 * Loading UI for /admin/users only.
 *
 * It lives in the `(list)` route group on purpose: a `loading.tsx` one level up
 * (`admin/users/`) also wraps `admin/users/[id]`, and its Suspense boundary
 * flushes the response as HTTP 200 before that page's `notFound()` runs —
 * turning a missing user (404) into a soft 200. Verified in Phase 47.
 *
 * The geometry mirrors the real page (header, toolbar, table rows) so the
 * content does not jump when it arrives.
 */
export default function UsersListLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading users…</span>

      <div className="mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>

      <div className="rounded-xl border border-border">
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
