/** Shift an assessment attempt back in time (expiry/closed simulation). Usage: tsx p4-time-travel.ts <attemptId> <minutesAgo> */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const attemptId = process.argv[2];
  const minutes = Number(process.argv[3] ?? "60");
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("attempt not found");
  const shift = (d: Date) => new Date(d.getTime() - minutes * 60_000);
  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: { startedAt: shift(attempt.startedAt), deadlineAt: attempt.deadlineAt ? shift(attempt.deadlineAt) : null },
  });
  console.log("shifted", attemptId, "back", minutes, "min");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
