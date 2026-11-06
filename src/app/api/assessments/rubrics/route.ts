import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { createRubric, scoreWithRubric } from "@/lib/assessment/intelligence/rubric";

const levelSchema = z.object({ score: z.number().min(0).max(100), description: z.string().trim().min(1).max(300) });
const criterionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  weight: z.number().min(1).max(100),
  levels: z.array(levelSchema).min(2),
});

const rubricCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  kind: z.enum(["WRITING", "SPEAKING", "GENERAL"]),
  courseId: z.string().trim().optional(),
  criteria: z.array(criterionSchema).min(1),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const payload = rubricCreateSchema.parse(await parseJsonBody(req));
  const rubric = await createRubric(user.id, payload);
  return jsonOk(rubric, 201);
});
