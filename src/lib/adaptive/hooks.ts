import { logSafeError } from "@/lib/logging";
/** Side effects only. A failure here must not break practice, exams, or voice. */
import { prisma } from "@/lib/prisma";
import { recordLearningEvent } from "./events";
import { grammarSkillCode, skillForActivity } from "./skills";

export function noteAdaptive(work: () => Promise<unknown>) {
  void work().catch((err) => logSafeError("adaptive.background-work-failed", err));
}

export async function noteActivityAttempt(input: { studentId: string; activityId: string; attemptId: string; isCorrect: boolean | null }) {
  const activity = await prisma.activity.findUnique({
    where: { id: input.activityId },
    select: { type: true, lessonId: true, grammar: { select: { id: true, title: true } }, vocabulary: { select: { vocabularyId: true, vocabulary: { select: { word: true } } }, take: 1 } },
  });
  if (!activity) return;
  const skillCode = skillForActivity(activity.type, activity.grammar?.title ?? null);
  const vocab = activity.vocabulary[0];
  const correct = input.isCorrect;
  await recordLearningEvent({
    studentId: input.studentId,
    eventType: correct === true ? "QUESTION_CORRECT" : correct === false ? "QUESTION_INCORRECT" : "PRACTICE_COMPLETED",
    sourceType: "ACTIVITY_ATTEMPT",
    sourceId: input.attemptId,
    skillCode,
    correct,
    knowledge: vocab
      ? { vocabularyId: vocab.vocabularyId, label: vocab.vocabulary.word, lessonId: activity.lessonId, kind: "VOCABULARY" }
      : activity.grammar
        ? { grammarId: activity.grammar.id, label: activity.grammar.title, lessonId: activity.lessonId, kind: "GRAMMAR" }
        : undefined,
    payload: { activityType: activity.type, activityId: input.activityId },
  });
}

export async function noteVocabulary(studentId: string, vocabularyId: string, known: boolean) {
  const word = await prisma.vocabulary.findUnique({ where: { id: vocabularyId }, select: { word: true, lessonId: true } });
  if (!word) return;
  const review = await prisma.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId, vocabularyId } } });
  await recordLearningEvent({
    studentId,
    eventType: known ? "VOCABULARY_CORRECT" : "VOCABULARY_INCORRECT",
    sourceType: "VOCABULARY_REVIEW",
    sourceId: `${vocabularyId}:${review?.correctCount ?? 0}:${review?.incorrectCount ?? 0}`,
    skillCode: "vocabulary",
    correct: known,
    knowledge: { vocabularyId, label: word.word, lessonId: word.lessonId, kind: "VOCABULARY" },
  });
}

export async function noteLesson(studentId: string, lessonId: string, completed: boolean) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  await recordLearningEvent({
    studentId,
    eventType: completed ? "LESSON_COMPLETED" : "LESSON_STARTED",
    sourceType: "LESSON",
    sourceId: `${lessonId}:${completed ? "completed" : "started"}`,
    skillCode: "reading",
    correct: null,
    payload: { title: lesson?.title ?? "Lesson" },
  });
}

export async function noteExam(studentId: string, attemptId: string, score: number, total: number) {
  await recordLearningEvent({
    studentId,
    eventType: "EXAM_COMPLETED",
    sourceType: "ASSESSMENT_ATTEMPT",
    sourceId: attemptId,
    correct: null,
    payload: { score, total, note: "Observed exam points. This alone does not set a skill to mastered." },
  });
}

export async function noteAssignment(studentId: string, submissionId: string) {
  await recordLearningEvent({
    studentId,
    eventType: "ASSIGNMENT_COMPLETED",
    sourceType: "ASSIGNMENT",
    sourceId: submissionId,
    skillCode: "writing",
    correct: null,
  });
}

export async function noteSpeaking(studentId: string, attemptId: string, understood: boolean, category: string | null) {
  await recordLearningEvent({
    studentId,
    eventType: "SPEAKING_COMPLETED",
    sourceType: "SPEECH_ATTEMPT",
    sourceId: attemptId,
    skillCode: "speaking",
    correct: understood,
    payload: { understood, category },
  });
}

export async function noteListening(studentId: string, attemptId: string, correct: number, total: number) {
  await recordLearningEvent({
    studentId,
    eventType: "LISTENING_COMPLETED",
    sourceType: "LISTENING_ATTEMPT",
    sourceId: attemptId,
    skillCode: "listening",
    correct: total > 0 && correct === total,
    payload: { correct, total, understood: total > 0 && correct === total },
  });
}

export async function noteTutor(studentId: string, sessionId: string, mode: string) {
  const skill = mode === "VOCABULARY" ? "vocabulary" : mode === "GRAMMAR" || mode === "MISTAKE_REVIEW" ? "grammar" : mode === "QUIZ" ? "grammar" : null;
  await recordLearningEvent({
    studentId,
    eventType: "AI_PRACTICE_COMPLETED",
    sourceType: "AI_SESSION",
    sourceId: sessionId,
    skillCode: skill,
    correct: null,
    payload: { mode, label: "Personalized AI Practice" },
  });
}

export function grammarCode(title: string) {
  return grammarSkillCode(title);
}
