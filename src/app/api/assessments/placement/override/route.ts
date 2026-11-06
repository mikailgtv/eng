import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertStudentInScope, requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { overridePlacement } from "@/lib/assessment/intelligence/placement";

const overrideSchema = z.object({
  studentId: z.string().min(1),
  level: z.string().min(1),
  reason: z.string().trim().min(8).max(500),
  applyToProfile: z.boolean().default(false),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const payload = overrideSchema.parse(await parseJsonBody(req));
  // Teacher overrides must follow the same group scope as assessment analytics;
  // otherwise a teacher who guesses a student ID could alter another tenant's profile.
  await assertStudentInScope(user, payload.studentId);
  const result = await overridePlacement(user.id, payload);
  return jsonOk(result);
});
