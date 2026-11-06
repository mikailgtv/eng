import { prisma } from "@/lib/prisma";

/** Short note for the tutor. No employee data, notes, or secrets. */
export async function tutorAdaptiveNote(studentId: string) {
  const [review, goal, override] = await Promise.all([
    prisma.studentKnowledgeState.findFirst({
      where: { studentId, state: "NEEDS_REVIEW" },
      orderBy: { lastIncorrectAt: "desc" },
      include: { item: { select: { label: true } } },
    }),
    prisma.learningGoal.findFirst({ where: { studentId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.teacherLearningOverride.findFirst({ where: { studentId, active: true, requiredLabel: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
  ]);
  if (override?.requiredLabel) return `Teacher review: ${override.requiredLabel}.`;
  if (review) return `Review ${review.item.label}. ${review.incorrectAttempts} incorrect and ${review.correctAttempts} correct answers are recorded.`;
  if (goal) return `Goal: ${goal.text}.`;
  return null;
}

export async function teacherLearningBoard(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  const since = new Date(Date.now() - 14 * 86400000);
  const [students, states, recent] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, group: { select: { id: true, name: true, type: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.studentSkillState.findMany({ where: { studentId: { in: studentIds } } }),
    prisma.learningEvent.groupBy({ by: ["studentId"], where: { studentId: { in: studentIds }, excludedAt: null, observedAt: { gte: since } } }),
  ]);
  const recentIds = new Set(recent.map((row) => row.studentId));
  return students.map((student) => {
    const mine = states.filter((row) => row.studentId === student.id);
    const needsReview = mine.some((row) => row.state === "NEEDS_REVIEW");
    const highErrors = mine.some((row) => row.incorrectCount >= 3 && row.incorrectCount > row.correctCount);
    const strong = mine.some((row) => row.state === "STRONG" || row.state === "MASTERED");
    const labels = [];
    if (mine.length === 0) labels.push("No practice recorded yet");
    else if (!recentIds.has(student.id)) labels.push("Low recent activity");
    if (needsReview) labels.push("Needs Review");
    if (highErrors) labels.push("High error frequency");
    if (strong) labels.push("Strong recent performance");
    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      group: student.group?.name ?? "No group",
      groupType: student.group?.type ?? null,
      labels,
    };
  });
}
