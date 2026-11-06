import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createListeningAssignment } from "@/lib/voice/service";

const schema = z.object({
  title: z.string().min(1).max(200),
  groupId: z.string().min(1),
  exerciseId: z.string().min(1),
  dueAt: z.string().datetime({ offset: true }),
  attemptsAllowed: z.number().int().min(1).max(5).optional(),
  publish: z.boolean().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const row = await createListeningAssignment(user, { ...body, dueAt: new Date(body.dueAt) });
  return jsonOk({ id: row.id }, 201);
});
