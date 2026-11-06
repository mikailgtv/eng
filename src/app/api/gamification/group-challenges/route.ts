import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createGroupChallenge } from "@/lib/gamification/service";

const schema = z.object({
  title: z.string().min(2).max(120),
  groupId: z.string().min(1),
  requirementCount: z.number().int().min(1).max(500),
  endAt: z.string().datetime({ offset: true }),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await createGroupChallenge(user, { ...body, endAt: new Date(body.endAt) }), 201);
});
