/** Print the id of a seeded lesson by exact title. Usage: tsx p3-lesson-id.ts "Title" */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { title: process.argv[2] },
    select: { id: true },
  });
  if (!lesson) throw new Error(`lesson not found: ${process.argv[2]}`);
  console.log(lesson.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
