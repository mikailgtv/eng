import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { scoreWithRubric } from "@/lib/assessment/intelligence/rubric";

const scoreSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().optional(),
  rubricVersionId: z.string().min(1),
  selections: z.array(z.object({ name: z.string().min(1), score: z.number().min(0) })).min(1),
  feedback: z.string().max(4000).optional(),
  finalize: z.boolean().default(false),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.review");
  const payload = scoreSchema.parse(await parseJsonBody(req));
  const result = await scoreWithRubric({
    ...payload,
    reviewerId: user.id,
  });
  return jsonOk(result);
});
