import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/constants";
import type { Role } from "@/lib/constants";

/* Small status/role pills. Color is always paired with a text label
   (never color alone — accessibility). */

const BADGE_BASE =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4";

export function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={cn(
        BADGE_BASE,
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} aria-hidden />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "border-slate-300 bg-slate-800 text-white border-transparent",
  TEACHER: "border-primary/30 bg-primary-subtle text-primary",
  STUDENT: "border-sky-200 bg-sky-50 text-sky-700",
};

export function RoleBadge({ role }: { role: string }) {
  const known = (["ADMIN", "TEACHER", "STUDENT"] as Role[]).includes(role as Role);
  return (
    <span className={cn(BADGE_BASE, known ? ROLE_STYLES[role as Role] : "border-border bg-muted/10 text-muted")}>
      {known ? roleLabel(role as Role) : role}
    </span>
  );
}

export function LevelBadge({ level }: { level: string | null | undefined }) {
  return (
    <span className={cn(BADGE_BASE, level ? "border-border bg-muted/10 text-foreground" : "border-dashed border-border text-muted")}>
      {level ? `Level ${level === "PRE_A1" ? "Pre-A1" : level}` : "No level yet"}
    </span>
  );
}

export function GroupTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(BADGE_BASE, "border-indigo-200 bg-indigo-50 text-indigo-700")}>
      {type === "FIREFIGHTER_SHIFT" ? "Firefighter shift" : type === "DAY_WORKER" ? "Day worker" : type.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
