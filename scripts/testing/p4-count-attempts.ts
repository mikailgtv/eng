/** Count attempts for (username, assessmentId). Usage: tsx p4-count-attempts.ts <username> <assessmentId> */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: process.argv[2] } });
  if (!user) throw new Error("user not found");
  const count = await prisma.assessmentAttempt.count({
    where: { studentId: user.id, assessmentId: process.argv[3] },
  });
  console.log(count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
