import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { visibleAnnouncements } from "@/lib/communication/announcements";
import { AcknowledgeButton } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Announcements" };

export default async function StudentAnnouncementsPage() {
  const user = await requirePageUser(["STUDENT", "TEACHER", "ADMIN"]);
  const items = await visibleAnnouncements(user);
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-semibold">Announcements</h1>
      <p className="mt-1 text-sm text-muted">Only announcements targeted to you are shown. A scheduled announcement stays hidden until its publish time.</p>
      {items.length === 0 && <p className="mt-4 text-sm">No current announcement.</p>}
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border p-4 text-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1">{item.body}</p>
            <p className="mt-1 text-xs text-muted">{item.type} · {item.priority} · {item.publishAt}{item.expireAt ? ` · until ${item.expireAt}` : ""}</p>
            <p>{item.acknowledged ? "Acknowledged" : item.acknowledgementRequired ? "Acknowledgement required" : "No acknowledgement required"}</p>
            {item.href && <p className="mt-2"><Link className="underline" href={item.href}>{item.linkLabel || "Open related page"}</Link></p>}
            {item.acknowledgementRequired && !item.acknowledged && <div className="mt-2"><AcknowledgeButton id={item.id} /></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
