import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { saveAnswer, type Viewer } from "@/lib/assessment/engine";

interface Ctx {
  params: { id: string; attemptId: string };
}

const bodySchema = z
  .object({
    questionId: z.string().trim().min(1),
    answer: z.unknown(),
  })
  .strict();

/**
 * POST /api/assessments/[id]/attempts/[attemptId]/answer — progressively save
 * ONE answer for the session student's active attempt (idempotent per
 * question; safe against refreshes and network retries). The server rejects
 * saves after the deadline or when the assessment was closed.
 */
export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const viewer: Viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const body = bodySchema.parse(await parseJsonBody(req));
  const result = await saveAnswer(viewer, ctx.params.attemptId, body.questionId, body.answer);
  return jsonOk(result);
});
