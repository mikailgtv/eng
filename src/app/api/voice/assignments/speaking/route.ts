import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createSpeakingAssignment } from "@/lib/voice/service";

const schema = z.object({
  title: z.string().min(1).max(200),
  groupId: z.string().min(1),
  topic: z.string().min(1),
  instructions: z.string().max(1000).optional(),
  dueAt: z.string().datetime({ offset: true }),
  minAttempts: z.number().int().min(1).max(10).optional(),
  gradingMode: z.enum(["COMPLETION", "TEACHER_REVIEW", "AI_FEEDBACK"]).optional(),
  publish: z.boolean().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const row = await createSpeakingAssignment(user, { ...body, dueAt: new Date(body.dueAt) });
  return jsonOk({ id: row.id }, 201);
});
