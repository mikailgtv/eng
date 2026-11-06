import { cn } from "@/lib/utils";

/** Brand mark + wordmark. Inline SVG (no external assets). */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden className="shrink-0">
        <rect width="34" height="34" rx="11" fill="#F4B63F" />
        <ellipse cx="10.2" cy="12.1" rx="2.7" ry="3.3" fill="#fff" transform="rotate(-22 10.2 12.1)" />
        <ellipse cx="16.7" cy="9.4" rx="2.7" ry="3.4" fill="#fff" />
        <ellipse cx="23.1" cy="12.1" rx="2.7" ry="3.3" fill="#fff" transform="rotate(22 23.1 12.1)" />
        <path d="M17 15.3c-2.1 0-3.2 2.1-5 3.8-1.2 1.2-2.1 2.3-1.8 3.7.3 1.6 2.1 2.2 3.7 1.8 1.2-.3 1.9-.8 3.1-.8s1.9.5 3.1.8c1.6.4 3.4-.2 3.7-1.8.3-1.4-.6-2.5-1.8-3.7-1.8-1.7-2.9-3.8-5-3.8Z" fill="#fff" />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">
          English<span className="text-primary">Bridge</span>
        </span>
      )}
    </span>
  );
}
