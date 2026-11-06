import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer } from "@/lib/teaching/queries";
import { listReviewItems } from "@/lib/ai/review";
import { TeacherAiControls } from "@/components/ai/teacher-ai-controls";

export const metadata: Metadata = { title: "Tutor settings" };

export default async function TeacherAiPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const [groups, items] = await Promise.all([
    groupsForViewer({ id: user.id, role: user.role, groupId: user.groupId }),
    listReviewItems({ id: user.id, role: user.role }),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">English Tutor for your groups</h1>
      <p className="mt-1 text-sm text-muted">You can turn practice on or off. Student conversations stay private. Nothing here publishes itself.</p>
      <TeacherAiControls
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        items={items.map((item) => ({
          id: item.id,
          prompt: item.prompt,
          answer: item.answer,
          status: item.status,
          lesson: item.lesson?.title ?? "No lesson",
          student: item.student.firstName,
        }))}
      />
    </div>
  );
}
