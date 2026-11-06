/** Print an assessment id by exact title. Usage: tsx p4-assessment-id.ts "Title" */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const a = await prisma.assessment.findFirst({ where: { title: process.argv[2] }, select: { id: true } });
  if (!a) throw new Error("assessment not found");
  console.log(a.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
