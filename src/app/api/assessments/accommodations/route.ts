import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { grantAccommodation } from "@/lib/assessment/intelligence/accommodation";

const accommodationSchema = z.object({
  studentId: z.string().min(1),
  assessmentId: z.string().trim().optional(),
  extraMinutes: z.number().int().min(0).max(180).optional(),
  largerText: z.boolean().optional(),
  extraInstructions: z.string().trim().max(1000).optional(),
  audioReplays: z.number().int().min(1).max(10).optional(),
  windowExtensionMinutes: z.number().int().min(0).max(1440).optional(),
  staffNote: z.string().trim().max(500).optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const payload = accommodationSchema.parse(await parseJsonBody(req));
  const result = await grantAccommodation(user.id, payload);
  return jsonOk(result, 201);
});
