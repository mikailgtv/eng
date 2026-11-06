import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setPlanStatus } from "@/lib/teaching/service";

const schema = z.object({ status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]) }).strict();

export const PATCH = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const plan = await setPlanStatus({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body.status);
  return jsonOk({ id: plan.id, status: plan.status });
});
