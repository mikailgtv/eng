import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { groupsForViewer } from "@/lib/teaching/queries";
import { ListeningAssignForm } from "@/components/voice/listening-assign-form";

export const metadata: Metadata = { title: "Listening" };

export default async function TeacherListeningPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const [groups, exercises] = await Promise.all([
    groupsForViewer({ id: user.id, role: user.role, groupId: user.groupId }),
    prisma.listeningExercise.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, topic: true } }),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Listening</h1>
      <p className="mt-1 text-sm text-muted">Assign a published listening practice. Results stay in listening attempts, not in exams.</p>
      <ListeningAssignForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} exercises={exercises} />
    </div>
  );
}
