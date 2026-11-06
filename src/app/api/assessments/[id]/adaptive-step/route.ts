import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { nextAdaptiveQuestion } from "@/lib/assessment/intelligence/adaptive";

interface Ctx {
  params: { id: string };
}

const stepSchema = z.object({
  previous: z.object({
    questionId: z.string().min(1),
    correct: z.boolean(),
  }).optional(),
}).strict();

export const POST = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["STUDENT"]);
  assertSameOrigin(req);
  const payload = stepSchema.parse(await parseJsonBody(req));
  const result = await nextAdaptiveQuestion(user.id, ctx.params.id, payload.previous);
  return jsonOk(result);
});
