import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { listNotifications } from "@/lib/communication/hub";
import { MarkAllRead, NoticeActions } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function TeacherNotificationsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const data = await listNotifications(user.id, { take: 20 });
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm">{data.unread} unread. This list is not a ranking.</p>
      <p className="mt-2 text-sm"><Link className="underline" href="/teacher/messages">Messages</Link> · <Link className="underline" href="/teacher/announcements">Announcements</Link> · <Link className="underline" href="/student/notifications/preferences">Preferences</Link></p>
      <div className="mt-3"><MarkAllRead /></div>
      <ul className="mt-4 space-y-2">
        {data.items.map((item) => (
          <li key={item.id} className="rounded-xl border border-border p-3 text-sm">
            <p className="font-medium">{item.title}</p>
            <p>{item.body}</p>
            <p className="text-xs text-muted">{item.category} · {item.priority} · {item.state} · {item.displayTime}</p>
            {item.href && <Link className="underline" href={item.href}>{item.actionLabel || "Open"}</Link>}
            <NoticeActions id={item.id} acknowledge={item.acknowledgementRequired && !item.acknowledgedAt} />
          </li>
        ))}
        {data.items.length === 0 && <li className="text-sm text-muted">No notifications.</li>}
      </ul>
    </div>
  );
}
