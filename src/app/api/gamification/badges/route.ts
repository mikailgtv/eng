import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { deactivateBadge, saveBadge } from "@/lib/gamification/service";

const schema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(60),
  description: z.string().min(2).max(200),
  category: z.string().min(2).max(40),
  requirementType: z.string().min(2).max(40),
  requirementCount: z.number().int().min(1).max(500),
  xpReward: z.number().int().min(0).max(30),
  icon: z.string().min(2).max(20),
  active: z.boolean().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  if (body.active === false) return jsonOk(await deactivateBadge(user.id, body.code));
  return jsonOk(await saveBadge(user.id, body), 201);
});
