"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Role } from "@/lib/constants";
import { MOBILE_TABS } from "@/lib/nav";

export function BottomNav({ role, onMore }: { role: Role; onMore: () => void }) {
  const pathname = usePathname();
  const tabs = MOBILE_TABS[role];
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${active ? "text-primary" : "text-muted"}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMore} className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted">
            <Menu className="h-5 w-5" aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
