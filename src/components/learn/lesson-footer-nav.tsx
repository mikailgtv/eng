import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonFooterNavProps {
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  /** e.g. "Module 2 of 6 · Lesson 3 of 5" */
  positionLabel: string;
}

/**
 * Previous / next lesson navigation. On mobile it sticks to the bottom of the
 * viewport so a student can move between lessons without reaching for the top
 * of the page; on desktop it renders as a simple two-sided row.
 */
export function LessonFooterNav({ prev, next, positionLabel }: LessonFooterNavProps) {
  const linkBase =
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-card transition-colors hover:bg-muted/10";

  return (
    <>
      {/* Mobile: sticky bottom bar */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-2">
          {prev ? (
            <Link href={`/student/learn/${prev.id}`} className={cn(linkBase, "justify-start")}>
              <ArrowLeft className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wide text-muted">Previous</span>
                <span className="block truncate text-[13px] font-medium text-foreground">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link href={`/student/learn/${next.id}`} className={cn(linkBase, "justify-end text-right")}>
              <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wide text-muted">Next</span>
                <span className="block truncate text-[13px] font-medium text-foreground">{next.title}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">{positionLabel}</p>
      </div>

      {/* Desktop: regular row */}
      <nav aria-label="Lesson navigation" className="mt-8 hidden items-stretch gap-3 sm:flex">
        {prev ? (
          <Link href={`/student/learn/${prev.id}`} className={linkBase}>
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-muted">Previous lesson</span>
              <span className="block truncate text-sm font-medium text-foreground">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        <p className="hidden items-center whitespace-nowrap px-2 text-xs text-muted lg:flex">{positionLabel}</p>
        {next ? (
          <Link href={`/student/learn/${next.id}`} className={cn(linkBase, "justify-end text-right")}>
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-muted">Next lesson</span>
              <span className="block truncate text-sm font-medium text-foreground">{next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </>
  );
}
