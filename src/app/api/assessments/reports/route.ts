import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { buildAssessmentReport } from "@/lib/assessment/intelligence/reports";

const reportSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  type: z.string().optional(),
  groupId: z.string().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.analytics");
  const payload = reportSchema.parse(await parseJsonBody(req));
  const result = await buildAssessmentReport(user.id, payload);
  return jsonOk(result);
});
