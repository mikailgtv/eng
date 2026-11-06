import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { visibleAnnouncements } from "@/lib/communication/announcements";
import { assignedGroupIds } from "@/lib/teaching/access";
import { prisma } from "@/lib/prisma";
import { AnnouncementForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Announcements" };

export default async function TeacherAnnouncementsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const ids = await assignedGroupIds(user);
  const groups = await prisma.learningGroup.findMany({ where: ids === null ? { status: "ACTIVE" } : { id: { in: ids ?? [] } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const items = await visibleAnnouncements(user);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Announcements</h1>
      <p className="mt-1 text-sm text-muted">Teachers can announce to assigned groups. Organization-wide and urgent notices are for administrators.</p>
      <section className="mt-4"><AnnouncementForm groups={groups} /></section>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => <li key={item.id} className="rounded-xl border border-border px-3 py-2"><span className="font-medium">{item.title}</span> · {item.type} · {item.publishAt}</li>)}
        {items.length === 0 && <li className="text-muted">No current announcement.</li>}
      </ul>
    </div>
  );
}
