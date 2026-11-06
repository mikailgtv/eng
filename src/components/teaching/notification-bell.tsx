"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

type Item = { id: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let stop = false;
    apiFetch<{ items: Item[]; unread: number }>("/api/notifications")
      .then((data) => {
        if (stop) return;
        setItems(data.items);
        setUnread(data.unread);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-foreground hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-72 rounded-xl border border-border bg-surface p-2 shadow-panel">
          <div className="mb-1 flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{unread ? `${unread} unread` : "Notifications"}</p>
            <span className="flex gap-2">
              {unread > 0 && <button type="button" className="text-xs underline" onClick={() => apiFetch("/api/notifications/read", { method: "POST", body: { all: true } }).then(() => setUnread(0))}>Mark read</button>}
              <Link href="/notifications" className="text-xs underline" onClick={() => setOpen(false)}>Open center</Link>
            </span>
          </div>
          {items.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">No notifications.</p>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {items.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="block rounded-lg px-2 py-2 text-sm hover:bg-muted/10" onClick={() => setOpen(false)}>
                      <span className="font-medium">{item.title}</span>
                      {item.body && <span className="mt-0.5 block text-xs text-muted">{item.body}</span>}
                    </Link>
                  ) : (
                    <p className="px-2 py-2 text-sm">{item.title}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
