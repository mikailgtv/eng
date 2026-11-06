import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createOverride } from "@/lib/adaptive/service";

const schema = z.object({
  groupId: z.string().optional(),
  studentId: z.string().optional(),
  prioritySkill: z.string().max(40).optional(),
  requiredLabel: z.string().max(80).optional(),
  note: z.string().max(200).optional(),
  reason: z.string().trim().min(8).max(300).optional(),
  durationDays: z.number().int().min(1).max(90).nullable().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await createOverride(user, body), 201);
});
