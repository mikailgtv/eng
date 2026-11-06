import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { groupSnapshot, groupsForViewer } from "@/lib/teaching/queries";
import { REPORT_KINDS } from "@/lib/certificates/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function TeacherReportsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const groups = await groupsForViewer({ id: user.id, role: user.role, groupId: user.groupId });
  const snaps = await Promise.all(groups.map((g) => groupSnapshot(g.id)));
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-muted">Descriptive group progress. No rankings.</p>
      <ul className="mt-4 space-y-2">
        {groups.map((g, i) => (
          <li key={g.id}>
            <Link href={`/teacher/groups/${g.id}?tab=reports`} className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:bg-muted/5">
              <span className="font-medium">{g.name}</span>
              <span className="mt-1 block text-xs text-muted">
                {snaps[i]?.course?.title ?? "No course"} · {snaps[i]?.progress === null || snaps[i]?.progress === undefined ? "no lesson progress yet" : `${snaps[i]?.progress}% average published-lesson completion`} · {g._count.members} students
              </span>
            </Link>
          </li>
        ))}
        {groups.length === 0 && <li className="text-sm text-muted">No groups assigned.</li>}
      </ul>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Certificate reports</h2>
        <p className="mt-1 text-sm text-muted">Your groups only. Alphabetical order is not a ranking. Employee codes are not included.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {groups.flatMap((group) => REPORT_KINDS.map((kind) => (
            <li key={`${group.id}-${kind}`}>
              {group.name} · {kind}{" "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=csv&groupId=${group.id}`}>CSV</a>
              {" · "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=xlsx&groupId=${group.id}`}>XLSX</a>
              {" · "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=pdf&groupId=${group.id}`}>PDF</a>
            </li>
          )))}
        </ul>
      </section>
    </div>
  );
}
