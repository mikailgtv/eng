import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { draftQuestionSuggestion, writingFeedbackSuggestion } from "@/lib/assessment/intelligence/ai";

const draftSchema = z.object({
  topic: z.string().trim().optional(),
}).strict();

const feedbackSchema = z.object({
  text: z.string().trim().default(""),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "draft";
  const body = await parseJsonBody(req);
  if (mode === "feedback") {
    const payload = feedbackSchema.parse(body);
    const result = writingFeedbackSuggestion(payload.text);
    return jsonOk(result);
  }
  draftSchema.parse(body);
  const result = await draftQuestionSuggestion();
  return jsonOk(result);
});
