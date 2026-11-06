import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { visibleAnnouncements } from "@/lib/communication/announcements";
import { AnnouncementForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const user = await requirePageUser(["ADMIN"]);
  const [groups, courses, students] = await Promise.all([
    prisma.learningGroup.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { id: true, title: true } }).then((rows) => rows.map((row) => ({ id: row.id, name: row.title }))),
    prisma.user.findMany({ where: { role: "STUDENT", status: "ACTIVE" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true } }).then((rows) => rows.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}` }))),
  ]);
  const items = await visibleAnnouncements(user);
  const acknowledged = await prisma.announcementAcknowledgement.count();
  const announcementCount = await prisma.announcement.count();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Announcements</h1>
      <p className="mt-1 text-sm text-muted">{announcementCount} saved. {acknowledged} acknowledgements. This is not a ranking. Scheduled notices stay hidden until the publish time.</p>
      <p className="mt-2 text-sm"><Link className="underline" href="/admin/notifications">Communication hub</Link></p>
      <section className="mt-4"><AnnouncementForm groups={groups} courses={courses} students={students} allowAll /></section>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => <li key={item.id} className="rounded-xl border border-border px-3 py-2">{item.title} · {item.type} · {item.priority} · {item.publishAt}</li>)}
      </ul>
    </div>
  );
}
