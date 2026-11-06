import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { groupSnapshot, groupsForViewer } from "@/lib/teaching/queries";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Groups" };

export default async function TeacherGroupsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const groups = await groupsForViewer({ id: user.id, role: user.role, groupId: user.groupId });
  const snaps = await Promise.all(groups.map((g) => groupSnapshot(g.id)));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">My groups</h1>
      <p className="mt-1 text-sm text-muted">Groups assigned to you. Progress is the average of published-lesson completion.</p>
      {groups.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon={Layers} title="No groups assigned." description="An administrator assigns the groups you teach." />
        </Card>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {groups.map((g, i) => {
            const snap = snaps[i];
            return (
              <li key={g.id}>
                <Card>
                  <CardBody>
                    <h2 className="font-semibold text-foreground">{g.name}</h2>
                    <dl className="mt-2 space-y-1 text-[13px] text-muted">
                      <div className="flex justify-between"><dt>Students</dt><dd className="font-medium text-foreground">{g._count.members}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Course</dt><dd className="text-right">{snap?.course?.title ?? "None"}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Level</dt><dd>{snap?.course?.level?.displayName ?? "—"}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Current lesson</dt><dd className="text-right">{snap?.current?.title ?? "—"}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Next class</dt><dd className="text-right">{snap?.nextSession ? formatDateTime(snap.nextSession.scheduledStart) : "None scheduled"}</dd></div>
                      <div className="flex justify-between"><dt>Progress</dt><dd>{snap?.progress === null || snap?.progress === undefined ? "—" : `${snap.progress}%`}</dd></div>
                    </dl>
                    <Link href={`/teacher/groups/${g.id}`} className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline">
                      Open group
                    </Link>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
