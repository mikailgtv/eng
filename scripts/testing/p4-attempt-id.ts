/** Print the latest attempt id for (student, assessment). Usage: tsx p4-attempt-id.ts <username> <assessmentId> */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: process.argv[2] } });
  if (!user) throw new Error("user not found");
  const a = await prisma.assessmentAttempt.findFirst({
    where: { studentId: user.id, assessmentId: process.argv[3] },
    orderBy: { attemptNumber: "desc" },
    select: { id: true },
  });
  if (!a) throw new Error("attempt not found");
  console.log(a.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
