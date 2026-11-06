import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";

const schema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().optional(),
  rating: z.enum(["HELPFUL", "NOT_HELPFUL"]),
  report: z.string().max(300).optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  const session = await prisma.aiSession.findFirst({ where: { id: body.sessionId, studentId: user.id }, select: { id: true } });
  if (!session) throw new ApiError(404, "Session not found.");
  const row = await prisma.aiFeedback.create({
    data: { sessionId: session.id, messageId: body.messageId, studentId: user.id, rating: body.rating, report: body.report?.trim() || null },
  });
  return jsonOk({ id: row.id }, 201);
});
