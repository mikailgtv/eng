/**
 * Test helper: satisfy a lesson's completion gate, then complete it.
 * Usage: tsx scripts/testing/p3-complete-flow.ts <username> <password> <lessonId>
 * Prints one line per step: ATTEMPT=<id>:<status> ... COMPLETE=<http status>
 * Correct answers are read from the DB (server-side data) — this simulates a
 * student who answers everything correctly.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const [, , username, password, lessonId] = process.argv;

  // 1. login → session cookie
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier: username, password }),
  });
  const setCookie = login.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!login.ok || !cookie) {
    console.log(`LOGIN=${login.status}`);
    process.exit(1);
  }

  // 2. required activities + their correct answers (from DB — server truth)
  const activities = await prisma.activity.findMany({
    where: { lessonId, status: "PUBLISHED", required: true },
    orderBy: { order: "asc" },
    include: { lesson: { select: { title: true } } },
  });

  const authHeaders = { "Content-Type": "application/json", Cookie: cookie, Origin: BASE };

  for (const activity of activities) {
    const cfg = JSON.parse(activity.configuration) as Record<string, unknown>;
    let answer: unknown;
    switch (activity.type) {
      case "MULTIPLE_CHOICE":
      case "LISTEN_AND_CHOOSE":
      case "VOCABULARY_RECOGNITION":
        answer = { optionId: cfg.correctOptionId };
        break;
      case "TRUE_FALSE":
        answer = { value: cfg.answer };
        break;
      case "FILL_BLANK":
        answer = { text: (cfg.acceptedAnswers as string[])[0] };
        break;
      case "MATCHING":
        answer = { pairs: cfg.pairs };
        break;
      case "WORD_ORDER":
        answer = { order: cfg.words };
        break;
      default:
        // self-assessed types: any valid submission satisfies the gate
        answer = { selfReported: true };
        if (activity.type === "FLASHCARD") {
          answer = { marks: [{ word: "x", response: "KNOWN" }] };
        }
        if (activity.type === "LISTEN_AND_TYPE") {
          answer = { text: cfg.transcript };
        }
    }

    const res = await fetch(`${BASE}/api/activities/${activity.id}/attempts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(answer),
    });
    const body = (await res.json()) as { data?: { feedback?: { isCorrect?: boolean } } };
    const isCorrect = body.data?.feedback?.isCorrect;
    console.log(`ATTEMPT=${activity.id}:${res.status}:${isCorrect === null ? "self" : isCorrect}`);
  }

  // 3. complete the lesson
  const complete = await fetch(`${BASE}/api/lessons/${lessonId}/complete`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ timeSpentSec: 42 }),
  });
  console.log(`COMPLETE=${complete.status}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
