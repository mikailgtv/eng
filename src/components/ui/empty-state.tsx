import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Honest, professional empty state. The app never fabricates data —
 * when there is nothing to show, we say so clearly.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted/10">
        <Icon className="h-5 w-5 text-muted" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Compact variant used inside dashboard rows/list items. */
export function EmptyInline({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("rounded-lg bg-muted/5 px-3 py-2.5 text-[13px] text-muted", className)}>{children}</p>;
}
