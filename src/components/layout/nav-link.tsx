"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

/** Sidebar/drawer navigation link with active-state highlighting. */
export function NavLink({ item, onNavigate, tone = "light" }: { item: NavItem; onNavigate?: () => void; tone?: "light" | "dark" }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        tone === "dark"
          ? active
            ? "bg-white/15 text-white shadow-sm"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
          : active
            ? "bg-primary-subtle text-primary"
            : "text-muted hover:bg-muted/10 hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}
