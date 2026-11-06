"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/teaching/notification-bell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { NAV_ITEMS } from "@/lib/nav";
import { fullName } from "@/lib/utils";
import type { SessionUser } from "@/types";

/**
 * Application shell.
 * - Desktop (lg+): fixed sidebar with role navigation + user card.
 * - Mobile: sticky top bar; full navigation opens in a slide-over drawer
 *   (navigation is redesigned for touch instead of shrinking the sidebar).
 */
export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const pathname = usePathname();
  const navItems = NAV_ITEMS[user.role];
  const currentItem = navItems.find((item) => item.href === pathname) ?? navItems.find((item) => pathname.startsWith(item.href + "/"));

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, select")) setKeyboard(true);
    };
    const onFocusOut = () => setKeyboard(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [children]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const navList = (tone: "light" | "dark" = "light") => (
    <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => (
        <NavLink key={item.href} item={item} tone={tone} onNavigate={() => setDrawerOpen(false)} />
      ))}
    </nav>
  );

  const userCard = (dark = false) => (
    <div className={dark ? "border-t border-white/10 p-4" : "border-t border-border p-4"}>
      <div className="flex items-center gap-3">
        <UserMenu user={user} />
        <div className="min-w-0">
          <p className={`truncate text-[13px] font-semibold ${dark ? "text-white" : "text-foreground"}`}>{fullName(user)}</p>
          <p className={`truncate text-xs ${dark ? "text-slate-400" : "text-muted"}`}>{user.employeeCode}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop navigation inspired by the friendly LearnFire reference */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col bg-[#142042] text-white shadow-[8px_0_32px_rgba(21,34,69,0.08)] lg:flex">
        <div className="flex h-[76px] items-center border-b border-white/10 px-5">
          <Brand className="[&_span]:text-white [&_span_span]:text-amber-300" />
        </div>
        <div className="px-5 pb-3 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Your learning space</div>
        <div className="flex flex-1 flex-col overflow-y-auto pb-4">{navList("dark")}</div>
        {user.role === "STUDENT" && (
          <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
              <img src="/images/englishbridge-firefighter-mascot.png" alt="" className="h-full w-full object-cover object-[85%_center]" />
            </span>
            <p className="text-xs font-semibold leading-5 text-white">You’re doing great!<br /><span className="font-normal text-slate-300">Keep learning, one step at a time.</span></p>
          </div>
        )}
        {userCard(true)}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="touch-target inline-flex items-center justify-center rounded-lg p-2 text-foreground transition-colors hover:bg-muted/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Brand />
        <span className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu user={user} />
        </span>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/45" aria-hidden onClick={() => setDrawerOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-border bg-surface shadow-panel"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto py-3">{navList()}</div>
            {userCard()}
          </div>
        </div>
      )}

      {/* Main column (offset by sidebar on desktop) */}
      <div className="flex min-h-dvh flex-col lg:pl-[252px]">
        <OfflineBanner />
        <div className="sticky top-0 z-20 hidden h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-400">EnglishBridge</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-[#18264a]">{currentItem?.label ?? "Learning"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 xl:inline-flex">Learn · Practice · Grow</span>
            <NotificationBell />
            <div className="h-8 w-px bg-slate-200" />
            <UserMenu user={user} />
          </div>
        </div>
        <main id="main-content" className="flex-1 py-5 sm:py-7 lg:py-8">
          <div className="page-container">{children}</div>
        </main>
        <footer className="border-t border-border py-4 pb-24 lg:pb-4">
          <p className="page-container text-xs text-muted">
            EnglishBridge — one web app for phone, tablet and desktop.
          </p>
        </footer>
      </div>
      {!keyboard && <BottomNav role={user.role} onMore={() => setDrawerOpen(true)} />}
    </div>
  );
}
