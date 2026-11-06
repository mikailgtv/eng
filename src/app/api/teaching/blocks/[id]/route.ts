import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { deleteBlock, saveBlock } from "@/lib/teaching/service";

const schema = z.object({ type: z.string().min(1), data: z.unknown() }).strict();

export const PATCH = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const block = await prisma.contentBlock.findUnique({ where: { id: ctx.params.id }, select: { lessonId: true } });
  if (!block) throw new ApiError(404, "Block not found.");
  const body = schema.parse(await parseJsonBody(req));
  const updated = await saveBlock({ id: user.id, role: user.role, groupId: user.groupId }, block.lessonId, { id: ctx.params.id, type: body.type, data: body.data });
  return jsonOk({ id: updated.id });
});

export const DELETE = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await deleteBlock({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id);
  return jsonOk({ ok: true });
});
