import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { buildVariants } from "@/lib/assessment/intelligence/variants";

interface Ctx {
  params: { id: string };
}

const variantInput = z.object({
  count: z.number().int().min(1).max(5).default(3),
}).strict();

export const POST = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const payload = variantInput.parse(await parseJsonBody(req));
  const result = await buildVariants(ctx.params.id, payload.count);
  return jsonOk(result, 201);
});
