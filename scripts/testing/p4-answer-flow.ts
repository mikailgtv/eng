/**
 * Test helper: answer every question of an attempt.
 * Usage: tsx p4-answer-flow.ts <username> <assessmentId> <attemptId> <correct|wrong|half>
 * Correct answers are read from the DB (server truth) — the API still grades
 * them server-side at submission.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const [, , username, assessmentId, attemptId, mode] = process.argv;

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier: username, password: "Student#Demo1" }),
  });
  const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!login.ok) throw new Error("login failed");
  const headers = { "Content-Type": "application/json", Cookie: cookie, Origin: BASE };

  const state = (await (
    await fetch(`${BASE}/api/assessments/${assessmentId}/attempts/${attemptId}`, { headers })
  ).json()) as {
    data: {
      questions: { id: string; type: string; config: Record<string, unknown>; options: { id: string; text: string }[] }[];
    };
  };
  const questions = state.data.questions;

  // Every graded attempt answers ~half wrong when mode=half.
  const halfCutoff = Math.ceil(questions.length / 2);

  let i = 0;
  for (const q of questions) {
    const wantsCorrect = mode === "correct" || (mode === "half" && i < halfCutoff);
    i += 1;
    let answer: unknown;
    if (mode === "wrong") {
      answer = wrongAnswerFor(q);
    } else {
      answer = await correctAnswerFor(q, wantsCorrect);
    }
    const res = await fetch(`${BASE}/api/assessments/${assessmentId}/attempts/${attemptId}/answer`, {
      method: "POST",
      headers,
      body: JSON.stringify({ questionId: q.id, answer }),
    });
    if (!res.ok) throw new Error(`save failed: ${res.status} ${await res.text()}`);
  }
  console.log(`ALL_SAVED ${questions.length}`);
}

async function correctAnswerFor(
  q: { id: string; type: string; config: Record<string, unknown>; options: { id: string; text: string }[] },
  correct: boolean
): Promise<unknown> {
  const row = await prisma.question.findUnique({ where: { id: q.id } });
  if (!row) throw new Error("question missing");
  const cfg = JSON.parse(row.configuration) as Record<string, unknown>;
  const options = await prisma.questionOption.findMany({ where: { questionId: q.id }, orderBy: { order: "asc" } });
  const pick = <T,>(right: T, wrong: T) => (correct ? right : wrong);

  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING": {
      const right = options.find((o) => o.isCorrect)!;
      const wrong = options.find((o) => !o.isCorrect) ?? right;
      return { optionId: pick(right.id, wrong.id) };
    }
    case "TRUE_FALSE": {
      const right = cfg.answer as boolean;
      return { value: pick(right, !right) };
    }
    case "FILL_BLANK": {
      const right = (cfg.acceptedAnswers as string[])[0];
      return { text: pick(right, "zz-wrong") };
    }
    case "MATCHING": {
      const right = cfg.pairs as { left: string; right: string }[];
      return {
        pairs: right.map((p, idx) =>
          pick(p, { left: p.left, right: idx === 0 ? shifted(p.right) : p.right })
        ),
      };
    }
    case "WORD_ORDER": {
      const words = cfg.words as string[];
      const right = [...words];
      const wrong = [...words].reverse();
      if (JSON.stringify(wrong) === JSON.stringify(right)) wrong.reverse();
      return { order: pick(right, wrong) };
    }
    default:
      return { text: "student answer" };
  }
}

function wrongAnswerFor(q: { type: string; config: Record<string, unknown>; options: { id: string; text: string; isCorrect?: boolean }[] }): unknown {
  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING": {
      const wrong = q.options.find((o) => !o.isCorrect) ?? q.options[0];
      return { optionId: wrong.id };
    }
    case "TRUE_FALSE":
      return { value: true };
    case "FILL_BLANK":
      return { text: "zz-wrong" };
    case "MATCHING": {
      const lefts = (q.config.lefts as string[]) ?? [];
      const rights = (q.config.rights as string[]) ?? [];
      return { pairs: lefts.map((left, i) => ({ left, right: rights[(i + 1) % rights.length] })) };
    }
    case "WORD_ORDER": {
      const tokens = (q.config.tokens as string[]) ?? [];
      const rev = [...tokens].reverse();
      return { order: JSON.stringify(rev) === JSON.stringify(tokens) ? tokens : rev };
    }
    default:
      return { text: "answer" };
  }
}

function shifted(s: string): string {
  return s + "؟";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
