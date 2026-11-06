import { prisma } from "@/lib/prisma";
import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser();
  const sp = new URL(req.url).searchParams;
  const take = Math.min(30, Math.max(1, Number(sp.get("take") ?? "15") || 15));
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, archivedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null, archivedAt: null } }),
  ]);
  return jsonOk({ items, unread });
});
