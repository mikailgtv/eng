import { prisma } from "@/lib/prisma";
import { SKILL_LABELS, type Skill } from "@/lib/assessment/registry";
import { recordLearningEvent } from "@/lib/adaptive/events";

const SKILL_CODES: Record<string, string> = {
  VOCABULARY: "vocabulary",
  GRAMMAR: "grammar",
  READING: "reading",
  WRITING: "writing",
  LISTENING: "listening",
  SPEAKING: "speaking",
};

/** Observed diagnostic evidence. Not an official grade and not a mastery claim. */
export async function recordDiagnostic(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: true, answers: true },
  });
  if (!attempt || attempt.assessment.type !== "DIAGNOSTIC") return null;
  if (await prisma.diagnosticProfile.findUnique({ where: { attemptId } })) return null;
  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.answers.map((answer) => answer.questionId) } },
    select: { id: true, skill: true },
  });
  const skillByQuestion = new Map(questions.map((question) => [question.id, question.skill]));
  const totals = new Map<string, { correct: number; total: number }>();
  for (const answer of attempt.answers) {
    const skill = skillByQuestion.get(answer.questionId);
    if (!skill || answer.isCorrect === null) continue;
    const row = totals.get(skill) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (answer.isCorrect) row.correct += 1;
    totals.set(skill, row);
  }
  const skills = [...totals.entries()].map(([skill, row]) => {
    const percent = row.total ? Math.round((row.correct / row.total) * 100) : 0;
    return {
      skill,
      label: SKILL_LABELS[skill as Skill] ?? skill,
      correct: row.correct,
      total: row.total,
      percent,
      recommendation: percent < 70 ? `Additional ${labelFor(skill)} practice is recommended.` : `${labelFor(skill)} answers in this diagnostic were mostly correct. This is not an official grade.`,
    };
  });
  const profile = await prisma.diagnosticProfile.create({
    data: { studentId: attempt.studentId, attemptId, assessmentId: attempt.assessmentId, skills: JSON.stringify(skills), officialGrade: false },
  });
  for (const skill of skills) {
    await recordLearningEvent({
      studentId: attempt.studentId,
      eventType: "DIAGNOSTIC_COMPLETED",
      sourceType: "DIAGNOSTIC_PROFILE",
      sourceId: `${attemptId}:${skill.skill}`,
      skillCode: SKILL_CODES[skill.skill] ?? null,
      correct: null,
      payload: { observedPercent: skill.percent, sample: skill.total, officialGrade: false, note: "Observed diagnostic performance. This does not set mastery or an official grade." },
    });
  }
  return { id: profile.id, officialGrade: false, skills };
}

function labelFor(skill: string) {
  return (SKILL_LABELS[skill as Skill] ?? skill).toLowerCase();
}
