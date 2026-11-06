import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { QuestionForm } from "@/components/assessment/question-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQuestionPage({ params }: PageProps) {
  const { id } = await params;
  await requirePageUser(["TEACHER", "ADMIN"]);
  const question = await prisma.question.findUnique({
    where: { id: id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!question || question.status === "ARCHIVED") notFound();

  const lessons = await prisma.lesson.findMany({
    include: { module: { include: { course: { include: { level: true } } } } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  });

  let configuration: Record<string, unknown> = {};
  try {
    configuration = JSON.parse(question.configuration) as Record<string, unknown>;
  } catch {
    configuration = {};
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Edit question" description="Changes apply to future assessments; past attempts are untouched." />
      <div className="mt-5">
        <QuestionForm
          isEdit
          defaults={{
            id: question.id,
            type: question.type,
            questionText: question.questionText,
            explanation: question.explanation ?? "",
            difficulty: question.difficulty,
            points: question.points,
            skill: question.skill ?? "",
            lessonId: question.lessonId ?? "",
            status: question.status,
            configuration,
            options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          }}
          reference={{
            levels: [...new Map(lessons.map((l) => [l.module.course.level.id, l.module.course.level])).values()].map((l) => ({
              id: l.id,
              code: l.code,
              displayName: l.displayName,
            })),
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
