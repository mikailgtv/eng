import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createTeacherChallenge } from "@/lib/gamification/service";

const schema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(300).optional(),
  groupId: z.string().min(1),
  requirementType: z.enum(["ANY", "SPEAKING_COMPLETED", "LISTENING_COMPLETED", "VOCABULARY_CORRECT", "LESSON_COMPLETED"]),
  requirementCount: z.number().int().min(1).max(20),
  endAt: z.string().datetime({ offset: true }),
  xpReward: z.number().int().min(0).max(30).optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await createTeacherChallenge(user, { ...body, endAt: new Date(body.endAt) }), 201);
});
