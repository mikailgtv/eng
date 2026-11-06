import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentSettingsForm } from "@/components/assessment/assessment-settings-form";

export const metadata: Metadata = { title: "New assessment" };

export default async function NewAssessmentPage() {
  await requirePageUser(["TEACHER", "ADMIN"]);
  const courses = await prisma.course.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="New assessment"
        description="Create a quiz or exam, then pick questions from the bank."
      />
      <div className="mt-5">
        <AssessmentSettingsForm
          mode="create"
          scope={{ courses }}
          initial={{
            title: "",
            description: "",
            type: "QUIZ",
            courseId: courses[0]?.id ?? "",
            durationMinutes: "10",
            passingScore: 70,
            maxAttempts: "3",
            randomizeQuestions: false,
            randomizeOptions: false,
            showResults: true,
            showCorrectAnswers: true,
            allowNavigation: true,
            status: "DRAFT",
            startAt: "",
            endAt: "",
          }}
        />
      </div>
    </div>
  );
}
