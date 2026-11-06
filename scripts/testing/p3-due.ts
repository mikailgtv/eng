import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findUnique({ where: { username: "james.carter" } });
  if (!u) throw new Error("james.carter not found");
  const r = await prisma.vocabularyReview.findFirst({ where: { studentId: u.id, vocabularyId: process.argv[2] } });
  if (!r || !r.dueAt) throw new Error("review row not found");
  const h = (r.dueAt.getTime() - Date.now()) / 3600000;
  console.log(JSON.stringify({ status: r.status, dueInHours: Math.round(h) }));
}
main().finally(() => prisma.$disconnect());
