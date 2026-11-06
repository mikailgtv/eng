import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assignedGroupIds } from "@/lib/teaching/access";
import { formatDateTime } from "@/lib/utils";
import { PlanForm, PlanStatusButton } from "@/components/teaching/plan-form";
import { groupsForViewer } from "@/lib/teaching/queries";

export const metadata: Metadata = { title: "Teaching plan" };

export default async function PlansPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const ids = await assignedGroupIds(viewer);
  const [plans, groups, sessions] = await Promise.all([
    prisma.teachingPlan.findMany({
      where: ids === null ? {} : { groupId: { in: ids } },
      include: { group: { select: { name: true } }, lesson: { select: { title: true } }, course: { select: { title: true } } },
      orderBy: { plannedDate: "asc" },
    }),
    groupsForViewer(viewer),
    prisma.classSession.findMany({
      where: { ...(ids === null ? {} : { groupId: { in: ids } }), status: "COMPLETED" },
      select: { id: true, groupId: true, lessonId: true, actualEnd: true, title: true },
      orderBy: { actualEnd: "desc" },
      take: 30,
    }),
  ]);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">Teaching plan</h1>
      <p className="mt-1 mb-4 text-sm text-muted">What you planned, and which completed classes match a planned lesson.</p>
      <PlanForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
      <ul className="mt-6 space-y-2">
        {plans.map((plan) => {
          const taught = sessions.find((s) => s.groupId === plan.groupId && s.lessonId && s.lessonId === plan.lessonId);
          return (
            <li key={plan.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
              <p className="font-medium">{plan.lesson?.title ?? "No lesson chosen"} · {plan.group.name}</p>
              <p className="text-xs text-muted">
                {plan.course?.title ?? "No course"} · planned {formatDateTime(plan.plannedDate)} · {plan.plannedDurationMin} min · {plan.status === "PLANNED" ? "Planned" : plan.status === "COMPLETED" ? "Completed" : "Cancelled"}
                {taught ? ` · taught in “${taught.title}”` : plan.status === "PLANNED" ? " · not taught yet" : ""}
              </p>
              {plan.status === "PLANNED" && <PlanStatusButton id={plan.id} />}
            </li>
          );
        })}
        {plans.length === 0 && <li className="text-sm text-muted">No teaching plans yet.</li>}
      </ul>
    </div>
  );
}
