import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assignedGroupIds } from "@/lib/teaching/access";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assignments" };

export default async function TeacherAssignmentsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const ids = await assignedGroupIds({ id: user.id, role: user.role, groupId: user.groupId });
  const rows = await prisma.assignment.findMany({
    where: ids === null ? {} : { groupId: { in: ids } },
    include: { group: { select: { name: true } }, _count: { select: { submissions: true } } },
    orderBy: { dueAt: "asc" },
  });
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted">Text submissions only. There is no file upload.</p>
        </div>
        <Link href="/teacher/assignments/new"><Button>Create assignment</Button></Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No assignments yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/teacher/assignments/${row.id}`} className="block rounded-xl border border-border bg-surface px-4 py-3 hover:bg-muted/5">
                <span className="font-medium">{row.title}</span>
                <span className="mt-1 block text-xs text-muted">
                  {row.group.name} · {row.type} · {row.status === "DRAFT" ? "Draft" : row.status === "CLOSED" ? "Closed" : "Published"} · due {formatDateTime(row.dueAt)} · {row._count.submissions} submissions
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
