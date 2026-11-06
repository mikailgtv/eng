import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { listNotifications } from "@/lib/communication/hub";
import { runDueReminders } from "@/lib/communication/reminders";
import { MarkAllRead, NoticeActions } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function StudentNotificationsPage({ searchParams: rawSearchParams }: { searchParams: Promise<{ category?: string; status?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["STUDENT"]);
  await runDueReminders().catch(() => undefined);
  const data = await listNotifications(user.id, { category: searchParams.category, status: searchParams.status, take: 20 });
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm">{data.unread} unread. Read and unread are labeled in text, not by color alone.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link className="underline" href="/student/notifications">All</Link>
        <Link className="underline" href="/student/notifications?status=unread">Unread</Link>
        <Link className="underline" href="/student/notifications?category=ASSIGNMENT">Assignments</Link>
        <Link className="underline" href="/student/notifications?category=EXAM">Exams</Link>
        <Link className="underline" href="/student/notifications?category=SCHEDULE">Schedule</Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link className="underline" href="/student/messages">Messages</Link>
        <Link className="underline" href="/student/announcements">Announcements</Link>
        <Link className="underline" href="/student/notifications/preferences">Preferences</Link>
      </div>
      <div className="mt-3"><MarkAllRead /></div>
      {data.items.length === 0 && <p className="mt-4 rounded-xl border border-border p-4 text-sm">No notifications in this view.</p>}
      <ul className="mt-4 space-y-3">
        {data.items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1">{item.body}</p>
            <p className="mt-1 text-xs text-muted">{item.category.replaceAll("_", " ")} · {item.priority} · {item.state} · {item.displayTime}{item.eventCount > 1 ? ` · ${item.eventCount} grouped` : ""}</p>
            {item.href && <p className="mt-2"><Link className="underline" href={item.href}>{item.actionLabel || "Open"}</Link></p>}
            <NoticeActions id={item.id} acknowledge={item.acknowledgementRequired && !item.acknowledgedAt} />
          </li>
        ))}
      </ul>
    </div>
  );
}
