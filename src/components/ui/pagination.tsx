import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Builds an href for a target page, preserving current filters. */
  hrefForPage: (page: number) => string;
}

/**
 * Server-rendered pagination: plain links (no client JS), preserves all
 * current query params. Hidden entirely when there is nothing to paginate.
 */
export function Pagination({ page, totalPages, total, pageSize, hrefForPage }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const navClasses = cn(
    "inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium",
    "transition-colors hover:bg-muted/10"
  );
  const disabledClasses = "pointer-events-none opacity-45";

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-[13px] text-muted">
        Showing <span className="font-medium tabular-nums text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium tabular-nums text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Link href={hrefForPage(Math.max(1, page - 1))} aria-disabled={prevDisabled} className={cn(navClasses, prevDisabled && disabledClasses)}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </Link>
        <span className="text-[13px] tabular-nums text-muted">
          Page {page} of {totalPages}
        </span>
        <Link
          href={hrefForPage(Math.min(totalPages, page + 1))}
          aria-disabled={nextDisabled}
          className={cn(navClasses, nextDisabled && disabledClasses)}
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
