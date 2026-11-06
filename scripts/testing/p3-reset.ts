/** Wipe practice-side data for the two demo students so the E2E suite is repeatable. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: { username: { in: ["james.carter", "lena.torres"] } },
    select: { id: true },
  });
  const ids = students.map((s) => s.id);
  const dA = await prisma.assessmentAnswer.deleteMany({ where: { attempt: { studentId: { in: ids } } } });
  const dE = await prisma.assessmentAttempt.deleteMany({ where: { studentId: { in: ids } } });
  // Phase 4 test artifacts (teacher-created during verify runs)
  const oldTests = await prisma.assessment.findMany({ where: { title: { startsWith: "P4TEST" } }, select: { id: true } });
  await prisma.assessment.deleteMany({ where: { id: { in: oldTests.map((a) => a.id) } } });
  await prisma.question.deleteMany({ where: { questionText: { startsWith: "P4TEST" } } });
  const d1 = await prisma.activityAttempt.deleteMany({ where: { studentId: { in: ids } } });
  const d2 = await prisma.vocabularyReview.deleteMany({ where: { studentId: { in: ids } } });
  const d3 = await prisma.lessonProgress.deleteMany({ where: { studentId: { in: ids } } });
  console.log(`wiped attempts=${d1.count} reviews=${d2.count} progress=${d3.count} examAttempts=${dE.count} examAnswers=${dA.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
