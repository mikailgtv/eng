import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

type Flag = { code: string; message: string; severity: "INFO" | "REVIEW" };

function tokens(text: string) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2));
}

function overlap(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  left.forEach((word) => { if (right.has(word)) shared += 1; });
  return shared / Math.max(left.size, right.size);
}

/** Flags problems. Never edits or deletes the question. */
export async function checkQuestionQuality(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true, bankMeta: true, level: { select: { code: true } } },
  });
  if (!question) throw new ApiError(404, "Question not found.");
  const flags: Flag[] = [];
  const config = safe(question.configuration);
  if (question.type === "MULTIPLE_CHOICE" || question.type === "LISTENING") {
    const correct = question.options.filter((option) => option.isCorrect);
    if (correct.length === 0) flags.push({ code: "NO_CORRECT_ANSWER", message: "No option is marked correct.", severity: "REVIEW" });
    if (correct.length > 1) flags.push({ code: "MULTIPLE_CORRECT", message: "More than one option is marked correct.", severity: "REVIEW" });
    if (question.options.length < 2) flags.push({ code: "INVALID_OPTIONS", message: "This question needs at least two options.", severity: "REVIEW" });
    for (const option of question.options) {
      if (option.text.trim().length < 1) flags.push({ code: "INVALID_OPTIONS", message: "An option is empty.", severity: "REVIEW" });
      if (option.text.length < 2) flags.push({ code: "SHORT_OPTION", message: `Option “${option.text}” is extremely short.`, severity: "INFO" });
      if (option.text.length > 160) flags.push({ code: "LONG_OPTION", message: "An option is extremely long.", severity: "INFO" });
    }
  }
  if (question.type === "TRUE_FALSE" && typeof config.answer !== "boolean") {
    flags.push({ code: "MISSING_ANSWER", message: "True or false has no stored answer.", severity: "REVIEW" });
  }
  if (question.type === "FILL_BLANK" && !Array.isArray(config.acceptedAnswers)) {
    flags.push({ code: "MISSING_ANSWER", message: "Fill in the blank has no accepted answer.", severity: "REVIEW" });
  }
  if (question.type === "LISTENING" && !config.audioUrl) {
    flags.push({ code: "MISSING_MEDIA", message: "Listening question has no audio.", severity: "REVIEW" });
  }
  if (question.questionText.trim().length < 8) {
    flags.push({ code: "AMBIGUOUS", message: "The question text is too short to judge clearly.", severity: "INFO" });
  }
  if (!question.skill || !question.levelId) {
    flags.push({ code: "METADATA", message: "Skill or level metadata is missing.", severity: "INFO" });
  }
  const others = await prisma.question.findMany({
    where: { id: { not: question.id }, status: { not: "ARCHIVED" } },
    select: { id: true, questionText: true },
    take: 300,
  });
  for (const other of others) {
    if (other.questionText.trim().toLowerCase() === question.questionText.trim().toLowerCase()) {
      flags.push({ code: "DUPLICATE", message: "Another question has the same text.", severity: "REVIEW" });
      break;
    }
    if (overlap(question.questionText, other.questionText) >= 0.8) {
      flags.push({ code: "SIMILAR", message: "Another question is very similar. A teacher should decide if both are needed.", severity: "INFO" });
      break;
    }
  }
  await prisma.assessmentQualityCheck.deleteMany({ where: { questionId } });
  if (flags.length) {
    await prisma.assessmentQualityCheck.createMany({
      data: flags.map((flag) => ({ questionId, code: flag.code, message: flag.message, severity: flag.severity })),
    });
  }
  return { questionId, changed: false, flags };
}

function safe(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}
