import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { QuestionForm, EMPTY_QUESTION } from "@/components/assessment/question-form";

export const metadata: Metadata = { title: "New question" };

export default async function NewQuestionPage() {
  await requirePageUser(["TEACHER", "ADMIN"]);
  const lessons = await prisma.lesson.findMany({
    include: { module: { include: { course: { include: { level: true } } } } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="New question" description="Add a reusable question to the bank." />
      <div className="mt-5">
        <QuestionForm
          isEdit={false}
          defaults={EMPTY_QUESTION}
          reference={{
            levels: lessons.length
              ? [...new Map(lessons.map((l) => [l.module.course.level.id, l.module.course.level])).values()].map((l) => ({
                  id: l.id,
                  code: l.code,
                  displayName: l.displayName,
                }))
              : [],
            lessons: lessons.map((l) => ({
              id: l.id,
              title: l.title,
              courseTitle: l.module.course.title,
              levelId: l.module.course.levelId,
            })),
          }}
        />
      </div>
    </div>
  );
}
