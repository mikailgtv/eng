import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";

const schema = z.object({ id: z.string().optional(), all: z.boolean().optional() }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = schema.parse(await parseJsonBody(req));
  const now = new Date();
  if (body.all) {
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: now } });
  } else if (body.id) {
    await prisma.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { readAt: now } });
  }
  return jsonOk({ ok: true });
});
