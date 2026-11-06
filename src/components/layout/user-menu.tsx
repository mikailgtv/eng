"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/client-api";
import { fullName } from "@/lib/utils";
import type { SessionUser } from "@/types";

/** Avatar + dropdown with identity, role, optional profile link, sign out. */
export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Account menu"
      >
        <Avatar person={user} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-surface p-2 shadow-panel"
        >
          <div className="border-b border-border px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-foreground">{fullName(user)}</p>
            <p className="truncate text-xs text-muted">{user.employeeCode}</p>
            <div className="mt-1.5">
              <RoleBadge role={user.role} />
            </div>
          </div>
          <div className="pt-1.5">
            {user.role === "STUDENT" && (
              <Link
                href="/student/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/10"
              >
                <UserRound className="h-4 w-4 text-muted" aria-hidden /> My profile
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/10"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
