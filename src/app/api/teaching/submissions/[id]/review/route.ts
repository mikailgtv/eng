import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { reviewSubmission } from "@/lib/teaching/service";

const schema = z.object({ feedback: z.string().max(4000).nullable().optional(), score: z.number().int().min(0).max(100).nullable().optional() }).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const row = await reviewSubmission({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body);
  return jsonOk({ id: row.id, status: row.status });
});
