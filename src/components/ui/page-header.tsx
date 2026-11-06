import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Consistent page title block with optional right-side actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
}

/** One KPI tile. Optionally links to the page managing that number. */
export function StatCard({ label, value, hint, icon: Icon, href }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted/70" aria-hidden />}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );

  const classes =
    "block rounded-xl border border-border bg-surface px-4 py-4 shadow-card transition-shadow sm:px-5" +
    (href ? " hover:shadow-card-hover" : "");

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
