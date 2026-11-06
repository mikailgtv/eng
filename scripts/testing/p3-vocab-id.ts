/** Print the id of a vocabulary word. Usage: tsx p3-vocab-id.ts "hello" */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const v = await prisma.vocabulary.findFirst({
    where: { word: process.argv[2] },
    select: { id: true },
  });
  if (!v) throw new Error(`vocabulary not found: ${process.argv[2]}`);
  console.log(v.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
