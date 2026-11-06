/**
 * Speaking and listening records. Raw audio is not stored.
 * Official exams, attendance, and grades are not written here.
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notifyGroupStudents } from "@/lib/teaching/notify";
import { assertGroupAccess } from "@/lib/teaching/access";
import { sendTutorMessage, startTutorSession } from "@/lib/ai/service";
import { topicById } from "./topics";
import { mistakeCategory, simpleFeedback, transcriptUnderstood } from "./match";
import { resolveVoiceLimits } from "./settings";

const KINDS = new Set(["SPEAKING", "LISTENING", "VOICE_CHAT", "PRONUNCIATION", "SHADOWING"]);

export async function startVoiceSession(student: { id: string; role: string; groupId: string | null; englishLevel: string | null }, input: {
  kind: string;
  topic?: string;
  lessonId?: string | null;
}) {
  if (student.role !== "STUDENT") throw new ApiError(403, "Only a student can start a speaking session.");
  const limits = await resolveVoiceLimits(student.groupId);
  if (!limits.enabled) throw new ApiError(403, "Speaking and listening are turned off.");
  if (!KINDS.has(input.kind)) throw new ApiError(422, "Unknown practice type.");
  await assertUnderLimit(student.id, limits);
  const topic = topicById(input.topic);
  const lesson = input.lessonId ? await lessonForStudent(student, input.lessonId) : null;
  const session = await prisma.voiceSession.create({
    data: {
      studentId: student.id,
      kind: input.kind,
      topic: lesson?.title ?? topic.title,
      lessonId: lesson?.id ?? null,
      levelAtTime: student.englishLevel || "PRE_A1",
    },
  });
  const prompt = openingPrompt(input.kind, topic, lesson?.title ?? null, student.englishLevel);
  await prisma.voiceMessage.create({ data: { sessionId: session.id, role: "PROMPT", content: prompt, source: "SCRIPT" } });
  let aiSessionId: string | null = null;
  if (input.kind === "VOICE_CHAT") {
    const tutor = await startTutorSession(student, { mode: "CONVERSATION", lessonId: lesson?.id, difficulty: student.englishLevel === "PRE_A1" || !student.englishLevel ? "EASY" : "NORMAL" });
    aiSessionId = tutor.sessionId;
    await prisma.voiceSession.update({ where: { id: session.id }, data: { aiSessionId } });
    await prisma.voiceMessage.create({ data: { sessionId: session.id, role: "ASSISTANT", content: tutor.reply.text, source: "SCRIPT" } });
  }
  return { sessionId: session.id, prompt, aiSessionId, maxAudioSec: limits.maxAudioSec, storeAudio: limits.storeAudio };
}

export async function recordTurn(student: { id: string; role: string; groupId: string | null }, sessionId: string, input: {
  target?: string;
  transcript?: string | null;
  source: "TYPED" | "STT";
  provider?: string;
  providerConfidence?: number | null;
  retry?: boolean;
}) {
  const session = await ownSession(student.id, sessionId);
  if (session.status !== "ACTIVE") throw new ApiError(422, "This session has ended.");
  if (input.source === "STT") {
    const limitsForMic = await resolveVoiceLimits(student.groupId);
    if (limitsForMic.requireConsent) {
      const consent = await prisma.voiceConsent.findFirst({ where: { studentId: student.id, revokedAt: null } });
      if (!consent) throw new ApiError(403, "Please accept the voice notice before using the microphone. You can still type.");
    }
  }
  const limits = await resolveVoiceLimits(student.groupId);
  await assertUnderLimit(student.id, limits);
  const heard = input.transcript?.trim() || null;
  if (heard && heard.length > 500) throw new ApiError(422, "That answer is too long.");
  const target = input.target?.trim() || session.topic;
  const understood = transcriptUnderstood(target, heard);
  const category = mistakeCategory(target, heard);
  if (heard) {
    await prisma.voiceMessage.create({ data: { sessionId, role: "USER", content: heard, source: input.source } });
  }
  await prisma.speechAttempt.create({
    data: {
      sessionId,
      studentId: student.id,
      targetText: target,
      recognizedText: heard,
      understood,
      provider: input.provider || (input.source === "TYPED" ? "typed" : "browser"),
      providerConfidence: typeof input.providerConfidence === "number" ? input.providerConfidence : null,
      mistakeCategory: category,
    },
  });
  await prisma.speechRecognitionRequest.create({
    data: { studentId: student.id, provider: input.provider || input.source.toLowerCase(), charCount: heard?.length ?? 0, ok: Boolean(heard) },
  });
  const words = understood ? target : null;
  await prisma.voiceSession.update({
    where: { id: session.id },
    data: {
      turns: { increment: 1 },
      recognizedCount: { increment: understood ? 1 : 0 },
      retryCount: { increment: input.retry ? 1 : 0 },
      durationSec: { increment: Math.min(limits.maxAudioSec, 15) },
      wordsPracticed: words ? appendWord(session.wordsPracticed, words) : session.wordsPracticed,
      mistakeNotes: category ? appendWord(session.mistakeNotes, category) : session.mistakeNotes,
    },
  });
  let assistant: string | null = null;
  if (session.kind === "VOICE_CHAT" && session.aiSessionId && heard) {
    const tutor = await sendTutorMessage(student, session.aiSessionId, heard);
    assistant = tutor.reply.text;
    await prisma.voiceMessage.create({ data: { sessionId, role: "ASSISTANT", content: assistant, source: "SCRIPT" } });
  }
  const feedback = session.kind === "VOICE_CHAT" && assistant
    ? assistant
    : simpleFeedback(target, heard, understood);
  if (category) await maybeRecommend(student.id, category, session.lessonId);
  const attempt = await prisma.speechAttempt.findFirst({ where: { sessionId, studentId: student.id }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (attempt) {
    const { noteAdaptive, noteSpeaking } = await import("@/lib/adaptive/hooks");
    noteAdaptive(() => noteSpeaking(student.id, attempt.id, understood, category));
  }
  return {
    understood,
    recognized: heard,
    feedback,
    assistant,
    practiceLabel: "AI Practice",
    pronunciationScore: null,
  };
}

export async function endVoiceSession(studentId: string, sessionId: string) {
  const session = await ownSession(studentId, sessionId);
  const summary = {
    turns: session.turns,
    recognized: session.recognizedCount,
    retries: session.retryCount,
    words: parseList(session.wordsPracticed),
    mistakes: parseList(session.mistakeNotes),
    note: "These are counts of understood transcripts. They are not a pronunciation score or a grade.",
  };
  await prisma.voiceSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", endedAt: new Date(), summary: JSON.stringify(summary) },
  });
  return summary;
}

export async function deleteOwnTranscripts(studentId: string, sessionId: string) {
  const session = await ownSession(studentId, sessionId);
  await prisma.voiceMessage.deleteMany({ where: { sessionId: session.id } });
  await prisma.speechAttempt.deleteMany({ where: { sessionId: session.id } });
  await prisma.voiceSession.update({ where: { id: session.id }, data: { status: "COMPLETED", summary: JSON.stringify({ deleted: true }) } });
  await audit({ actorId: studentId, action: "VOICE_TRANSCRIPT_DELETED", entityType: "VOICE", entityId: session.id, metadata: { storedAudio: false } });
  return { deleted: true };
}

export async function listOwnVoiceSessions(studentId: string) {
  return prisma.voiceSession.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { id: true, kind: true, topic: true, status: true, startedAt: true, endedAt: true, turns: true, recognizedCount: true, levelAtTime: true, summary: true },
  });
}

export async function getOwnVoiceSession(studentId: string, sessionId: string) {
  const session = await prisma.voiceSession.findFirst({
    where: { id: sessionId, studentId },
    include: { messages: { orderBy: { createdAt: "asc" } }, attempts: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) throw new ApiError(404, "Session not found.");
  return session;
}

export async function logTts(studentId: string, provider: string, text: string) {
  await prisma.ttsRequest.create({ data: { studentId, provider, charCount: text.length } });
}

export async function submitListening(student: { id: string; role: string; groupId: string | null }, exerciseId: string, answers: Record<string, string>, assignmentId?: string) {
  if (student.role !== "STUDENT") throw new ApiError(403, "Only a student can submit listening practice.");
  const exercise = await prisma.listeningExercise.findFirst({ where: { id: exerciseId, status: "PUBLISHED" } });
  if (!exercise) throw new ApiError(404, "Listening exercise not found.");
  if (assignmentId) {
    const assignment = await prisma.listeningAssignment.findFirst({ where: { id: assignmentId, exerciseId, groupId: student.groupId ?? "__none__", status: "PUBLISHED" } });
    if (!assignment) throw new ApiError(404, "Listening assignment not found.");
    const used = await prisma.listeningAttempt.count({ where: { assignmentId, studentId: student.id } });
    if (used >= assignment.attemptsAllowed) throw new ApiError(422, "No attempts left for this listening assignment.");
  }
  const questions = parseQuestions(exercise.questions);
  let correct = 0;
  const detail = questions.map((q) => {
    const given = (answers[q.id] ?? "").trim();
    const ok = given.toLowerCase() === q.answer.toLowerCase();
    if (ok) correct += 1;
    return { id: q.id, correct: ok, explanation: q.explanation };
  });
  const attempt = await prisma.listeningAttempt.create({
    data: {
      exerciseId,
      studentId: student.id,
      assignmentId: assignmentId ?? null,
      answers: JSON.stringify(answers),
      correctCount: correct,
      questionCount: questions.length,
    },
  });
  const { noteAdaptive, noteListening } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteListening(student.id, attempt.id, correct, questions.length));
  return {
    id: attempt.id,
    correct,
    total: questions.length,
    detail,
    label: "Listening practice. This is not an exam grade.",
  };
}

export async function createSpeakingAssignment(teacher: { id: string; role: string; groupId: string | null }, input: {
  title: string;
  groupId: string;
  topic: string;
  instructions?: string | null;
  dueAt: Date;
  minAttempts?: number;
  gradingMode?: string;
  lessonId?: string | null;
  publish?: boolean;
}) {
  await assertGroupAccess(teacher, input.groupId);
  const mode = input.gradingMode && ["COMPLETION", "TEACHER_REVIEW", "AI_FEEDBACK"].includes(input.gradingMode) ? input.gradingMode : "COMPLETION";
  const row = await prisma.speakingAssignment.create({
    data: {
      title: input.title.trim(),
      groupId: input.groupId,
      teacherId: teacher.id,
      topic: topicById(input.topic).title,
      instructions: input.instructions?.trim() || null,
      dueAt: input.dueAt,
      minAttempts: input.minAttempts ?? 1,
      gradingMode: mode,
      lessonId: input.lessonId || null,
      status: input.publish ? "PUBLISHED" : "DRAFT",
    },
  });
  if (row.status === "PUBLISHED") {
    await notifyGroupStudents(row.groupId, { type: "ASSIGNMENT", title: "New speaking practice", body: row.title, href: "/student/speaking" });
  }
  await audit({ actorId: teacher.id, action: "SPEAKING_ASSIGNMENT_CREATED", entityType: "VOICE", entityId: row.id, metadata: { status: row.status, gradingMode: mode } });
  return row;
}

export async function createListeningAssignment(teacher: { id: string; role: string; groupId: string | null }, input: {
  title: string;
  groupId: string;
  exerciseId: string;
  dueAt: Date;
  attemptsAllowed?: number;
  publish?: boolean;
}) {
  await assertGroupAccess(teacher, input.groupId);
  const exercise = await prisma.listeningExercise.findFirst({ where: { id: input.exerciseId, status: "PUBLISHED" } });
  if (!exercise) throw new ApiError(404, "Listening exercise not found.");
  const row = await prisma.listeningAssignment.create({
    data: {
      title: input.title.trim(),
      groupId: input.groupId,
      teacherId: teacher.id,
      exerciseId: exercise.id,
      dueAt: input.dueAt,
      attemptsAllowed: input.attemptsAllowed ?? 2,
      status: input.publish ? "PUBLISHED" : "DRAFT",
    },
  });
  if (row.status === "PUBLISHED") {
    await notifyGroupStudents(row.groupId, { type: "ASSIGNMENT", title: "New listening practice", body: row.title, href: "/student/listening" });
  }
  await audit({ actorId: teacher.id, action: "LISTENING_ASSIGNMENT_CREATED", entityType: "VOICE", entityId: row.id, metadata: { status: row.status } });
  return row;
}

export async function teacherVoiceSummary(viewer: { id: string; role: string }) {
  const { assignedGroupIds } = await import("@/lib/teaching/access");
  const ids = await assignedGroupIds(viewer);
  const limits = await resolveVoiceLimits(null);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", ...(ids === null ? {} : { groupId: { in: ids } }) },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);
  const [sessions, attempts, listening] = await Promise.all([
    prisma.voiceSession.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, studentId: true, topic: true, kind: true, turns: true, recognizedCount: true, mistakeNotes: true, status: true, startedAt: true },
      orderBy: { startedAt: "desc" },
      take: 40,
    }),
    prisma.speechAttempt.count({ where: { studentId: { in: studentIds } } }),
    prisma.listeningAttempt.count({ where: { studentId: { in: studentIds } } }),
  ]);
  return {
    sessions: limits.teacherTranscripts ? sessions : sessions.map((s) => ({ ...s, mistakeNotes: null })),
    transcriptsVisible: limits.teacherTranscripts,
    speechAttempts: attempts,
    listeningAttempts: listening,
  };
}

export async function voiceUsage() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [sessions, stt, tts, errors] = await Promise.all([
    prisma.voiceSession.count(),
    prisma.speechRecognitionRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.ttsRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.speechRecognitionRequest.count({ where: { createdAt: { gte: since }, ok: false } }),
  ]);
  const active = await prisma.voiceSession.groupBy({ by: ["studentId"], where: { startedAt: { gte: since } } });
  return { totalSessions: sessions, sttRequests7d: stt, ttsRequests7d: tts, sttErrors7d: errors, activeLearners7d: active.length };
}

async function ownSession(studentId: string, sessionId: string) {
  const session = await prisma.voiceSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) throw new ApiError(404, "Session not found.");
  return session;
}

async function assertUnderLimit(studentId: string, limits: { dailyMinutes: number; monthlyMinutes: number }) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const month = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
  const [daily, monthly] = await Promise.all([
    prisma.voiceSession.aggregate({ where: { studentId, startedAt: { gte: day } }, _sum: { durationSec: true } }),
    prisma.voiceSession.aggregate({ where: { studentId, startedAt: { gte: month } }, _sum: { durationSec: true } }),
  ]);
  if ((daily._sum.durationSec ?? 0) / 60 >= limits.dailyMinutes) throw new ApiError(429, "Daily speaking time is used up. You can still read and type later.");
  if ((monthly._sum.durationSec ?? 0) / 60 >= limits.monthlyMinutes) throw new ApiError(429, "Monthly speaking time is used up.");
}

async function lessonForStudent(student: { id: string; groupId: string | null }, lessonId: string) {
  if (!student.groupId) return null;
  return prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED", module: { course: { status: "PUBLISHED", assignments: { some: { groupId: student.groupId } } } } },
    select: { id: true, title: true },
  });
}

function openingPrompt(kind: string, topic: { title: string; prompts: string[]; words: string[] }, lessonTitle: string | null, level: string | null) {
  const first = topic.prompts[0] ?? "Hello. What is your name?";
  if (kind === "PRONUNCIATION") return `Say this word: ${topic.words[0] ?? "hello"}`;
  if (kind === "SHADOWING") return "Good morning. How are you?";
  if (level === "A2") return lessonTitle ? `Let's talk about ${lessonTitle}. ${first}` : first;
  return lessonTitle ? `${lessonTitle}. ${first}` : first;
}

function appendWord(current: string | null, word: string) {
  const list = parseList(current);
  if (!list.includes(word)) list.push(word);
  return JSON.stringify(list.slice(0, 20));
}

function parseList(raw: string | null): string[] {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function maybeRecommend(studentId: string, category: string, lessonId: string | null) {
  const count = await prisma.speechAttempt.count({ where: { studentId, mistakeCategory: category } });
  if (count < 3) return;
  const suggestion = `Review ${category} in speaking practice.`;
  const existing = await prisma.aiRecommendation.findFirst({ where: { studentId, suggestion, dismissedAt: null } });
  if (existing) return;
  await prisma.aiRecommendation.create({
    data: { studentId, reason: `${count} speaking transcripts were not the full phrase (${category}).`, suggestion, lessonId, source: "PRACTICE" },
  });
}

type Question = { id: string; prompt: string; options?: string[]; answer: string; explanation: string };

function parseQuestions(raw: string): Question[] {
  const parsed = JSON.parse(raw) as Question[];
  return Array.isArray(parsed) ? parsed : [];
}


