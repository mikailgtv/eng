/**
 * Tutor sessions. Identity, level, and limits come from the server.
 * The tutor never writes exams, attendance, or progress.
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { curriculumReply, summarizeSession } from "./curriculum-provider";
import { buildLearningContext } from "./context";
import { externalTutorReply, externalTutorConfigured } from "./http-provider";
import { countTodayUsage, resolveAiSettings } from "./settings";
import { AI_MODES, parseState, type AiDifficulty, type AiMode, type TutorTurn } from "./types";

const STRUCTURED = new Set(["VOCABULARY", "GRAMMAR", "QUIZ", "MISTAKE_REVIEW"]);

export async function startTutorSession(student: { id: string; role: string; groupId: string | null }, input: {
  mode: string;
  difficulty?: string;
  lessonId?: string | null;
  showTranslation?: boolean;
}) {
  if (student.role !== "STUDENT") throw new ApiError(403, "Only a student can start a tutor session.");
  const settings = await resolveAiSettings(student.groupId);
  if (!settings.enabled) throw new ApiError(403, "English Tutor is turned off for your group.");
  const mode = assertMode(input.mode, settings.allowedModes);
  if (mode === "CONVERSATION" && !settings.conversationEnabled) {
    throw new ApiError(403, "Conversation practice is turned off for your group.");
  }
  const context = await buildLearningContext(student.id, input.lessonId);
  const difficulty = resolveDifficulty(input.difficulty, context.level, settings.defaultDifficulty);
  const showTranslation = Boolean(input.showTranslation) && settings.translationEnabled;
  const session = await prisma.aiSession.create({
    data: {
      studentId: student.id,
      mode,
      levelAtTime: context.level,
      difficulty,
      lessonId: context.lessonId,
      topic: context.lessonTitle,
      showTranslation,
      state: JSON.stringify(parseState(null)),
    },
  });
  const reply = await produceReply({
    mode,
    context,
    stateRaw: null,
    message: "",
    opening: true,
    difficulty,
    showTranslation,
    history: [],
    maxChars: settings.maxResponseChars,
  });
  await saveAssistant(session.id, reply);
  await prisma.aiSession.update({ where: { id: session.id }, data: { state: JSON.stringify(reply.nextState) } });
  await logUsage(student, session.id, mode, reply, 0);
  return { sessionId: session.id, reply: publicReply(reply), level: context.level, providerConfigured: externalTutorConfigured() };
}

export async function sendTutorMessage(student: { id: string; role: string; groupId: string | null }, sessionId: string, message: string) {
  const session = await ownSession(student.id, sessionId);
  if (session.status !== "ACTIVE") throw new ApiError(422, "This practice session has ended. Start a new one.");
  const settings = await resolveAiSettings(student.groupId);
  if (!settings.enabled) throw new ApiError(403, "English Tutor is turned off.");
  const text = message.trim();
  if (!text) throw new ApiError(422, "Write a message before sending.");
  if (text.length > settings.maxInputChars) throw new ApiError(422, `Keep the message under ${settings.maxInputChars} characters.`);
  const used = await countTodayUsage(student.id);
  if (used >= settings.dailyRequestLimit) throw new ApiError(429, "Daily tutor limit reached. Try again tomorrow.");
  const historyCount = await prisma.aiMessage.count({ where: { sessionId } });
  if (historyCount >= 80) throw new ApiError(422, "This session is full. Start a new conversation.");

  const context = await buildLearningContext(student.id, session.lessonId);
  await prisma.aiMessage.create({ data: { sessionId, role: "USER", content: text } });
  const history = await recentHistory(sessionId);
  const reply = await produceReply({
    mode: session.mode,
    context,
    stateRaw: session.state,
    message: text,
    opening: false,
    difficulty: session.difficulty,
    showTranslation: session.showTranslation,
    history,
    maxChars: settings.maxResponseChars,
  });
  const saved = await saveAssistant(session.id, reply);
  await prisma.aiSession.update({ where: { id: session.id }, data: { state: JSON.stringify(reply.nextState) } });
  if (reply.generated?.length && student.groupId) {
    await prisma.aiGeneratedItem.createMany({
      data: reply.generated.slice(0, 2).map((item) => ({
        sessionId,
        studentId: student.id,
        groupId: student.groupId,
        lessonId: context.lessonId,
        kind: item.kind,
        prompt: item.prompt,
        answer: item.answer,
        status: "DRAFT",
      })),
    });
  }
  await logUsage(student, session.id, session.mode, reply, text.length);
  return { messageId: saved.id, reply: publicReply(reply) };
}

export async function endTutorSession(studentId: string, sessionId: string) {
  const session = await ownSession(studentId, sessionId);
  const state = parseState(session.state);
  const context = await buildLearningContext(studentId, session.lessonId);
  const summary = summarizeSession({ state, recommendation: context.recommendation });
  await prisma.aiSession.update({
    where: { id: session.id },
    data: { status: "ENDED", endedAt: new Date(), summary: JSON.stringify(summary) },
  });
  const { noteAdaptive, noteTutor } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteTutor(studentId, session.id, session.mode));
  return summary;
}

export async function listOwnSessions(studentId: string) {
  return prisma.aiSession.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { id: true, mode: true, status: true, startedAt: true, endedAt: true, levelAtTime: true, topic: true, summary: true },
  });
}

export async function getOwnSession(studentId: string, sessionId: string) {
  const session = await prisma.aiSession.findFirst({
    where: { id: sessionId, studentId },
    include: {
      messages: {
        where: { role: { in: ["USER", "ASSISTANT"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, metadata: true, createdAt: true },
      },
    },
  });
  if (!session) throw new ApiError(404, "Session not found.");
  return session;
}

async function ownSession(studentId: string, sessionId: string) {
  const session = await prisma.aiSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) throw new ApiError(404, "Session not found.");
  return session;
}

async function produceReply(input: {
  mode: string;
  context: Awaited<ReturnType<typeof buildLearningContext>>;
  stateRaw: string | null;
  message: string;
  opening: boolean;
  difficulty: string;
  showTranslation: boolean;
  history: { role: "user" | "assistant"; content: string }[];
  maxChars: number;
}): Promise<TutorTurn> {
  const grounded = curriculumReply({
    mode: input.mode,
    level: input.context.level,
    difficulty: input.difficulty,
    showTranslation: input.showTranslation,
    context: input.context,
    message: input.message,
    state: parseState(input.stateRaw),
    opening: input.opening,
  });
  if (STRUCTURED.has(input.mode) || input.opening || !externalTutorConfigured()) {
    return { ...grounded, text: grounded.text.slice(0, input.maxChars) };
  }
  try {
    const text = await externalTutorReply({
      mode: input.mode,
      level: input.context.level,
      context: input.context,
      history: input.history,
      message: input.message,
      maxChars: input.maxChars,
    });
    return { ...grounded, text, provider: "external", metadata: { ...grounded.metadata, provider: "external", practiceLabel: "AI Practice" } };
  } catch {
    return {
      ...grounded,
      text: `English Tutor is temporarily unavailable. Here is practice from your course instead.\n\n${grounded.text}`.slice(0, input.maxChars),
      metadata: { ...grounded.metadata, providerFallback: true },
    };
  }
}

async function saveAssistant(sessionId: string, reply: TutorTurn) {
  return prisma.aiMessage.create({
    data: {
      sessionId,
      role: "ASSISTANT",
      content: reply.text,
      metadata: JSON.stringify({ ...reply.metadata, translation: reply.translation, correction: reply.correction }),
    },
  });
}

async function recentHistory(sessionId: string) {
  const rows = await prisma.aiMessage.findMany({
    where: { sessionId, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { role: true, content: true },
  });
  return rows.reverse().map((row) => ({ role: row.role === "USER" ? "user" as const : "assistant" as const, content: row.content }));
}

async function logUsage(student: { id: string; groupId: string | null }, sessionId: string, mode: string, reply: TutorTurn, inputChars: number) {
  await prisma.aiUsage.create({
    data: {
      studentId: student.id,
      groupId: student.groupId,
      sessionId,
      mode,
      provider: reply.provider,
      inputChars,
      outputChars: reply.text.length,
      estimatedTokens: Math.ceil((inputChars + reply.text.length) / 4),
      ok: true,
    },
  });
}

function publicReply(reply: TutorTurn) {
  return {
    text: reply.text,
    translation: reply.translation,
    correction: reply.correction,
    practiceLabel: "AI Practice",
    provider: reply.provider === "external" ? "external" : "curriculum",
  };
}

function assertMode(mode: string, allowed: AiMode[]): AiMode {
  if (!(AI_MODES as readonly string[]).includes(mode)) throw new ApiError(422, "Unknown practice mode.");
  if (!allowed.includes(mode as AiMode)) throw new ApiError(403, "That practice mode is turned off.");
  return mode as AiMode;
}

function resolveDifficulty(requested: string | undefined, level: string, fallback: AiDifficulty): AiDifficulty {
  const value = requested === "NORMAL" || requested === "CHALLENGE" || requested === "EASY" ? requested : fallback;
  if ((level === "PRE_A1" || !level) && !requested) return "EASY";
  return value;
}

export async function usageSummary() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [sessions, messages, users, recent] = await Promise.all([
    prisma.aiSession.count(),
    prisma.aiMessage.count({ where: { role: { in: ["USER", "ASSISTANT"] } } }),
    prisma.aiUsage.groupBy({ by: ["studentId"], where: { createdAt: { gte: since } } }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, groupId: true, estimatedTokens: true, provider: true },
    }),
  ]);
  const byDay = new Map<string, number>();
  const byGroup = new Map<string, number>();
  let estimatedTokens = 0;
  for (const row of recent) {
    const day = row.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    if (row.groupId) byGroup.set(row.groupId, (byGroup.get(row.groupId) ?? 0) + 1);
    estimatedTokens += row.estimatedTokens ?? 0;
  }
  return {
    totalSessions: sessions,
    totalMessages: messages,
    activeUsers7d: users.length,
    estimatedTokens7d: estimatedTokens,
    byDay: [...byDay.entries()].map(([day, count]) => ({ day, count })),
    byGroup: [...byGroup.entries()].map(([groupId, count]) => ({ groupId, count })),
    providerConfigured: externalTutorConfigured(),
  };
}
