import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0 – 100 (calculated from real records by the caller). */
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Accessible progress bar: ARIA progressbar role + always-visible percentage
 * text, so progress is never communicated by color alone.
 */
export function ProgressBar({ value, label, size = "md", className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

  return (
    <div className={className}>
      {(label || true) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="text-[13px] font-medium text-foreground">{label}</span>}
          <span className="text-[13px] font-semibold tabular-nums text-primary">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className={cn("w-full overflow-hidden rounded-full bg-muted/20", heights[size])}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
