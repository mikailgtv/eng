/** Print VocabularyReview rows for one vocabulary word id. Usage: tsx p3-rows.ts <vocabId> */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.vocabularyReview.findMany({
    where: { vocabularyId: process.argv[2] },
    select: { studentId: true, status: true, correctCount: true, incorrectCount: true },
  });
  console.log(JSON.stringify(rows));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
