import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { effectiveLevels } from "@/lib/learning/level-catalog";
import { BookCenter } from "@/components/books/book-center";

export default async function AdminBooksPage() {
  const user = await requirePageUser(["ADMIN"]);
  const actor = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true } });
  const levels = await effectiveLevels(actor?.organizationId ?? null);
  return <BookCenter levels={levels} />;
}
