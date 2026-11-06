import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { listReviewQueue } from "@/lib/assessment/intelligence/review";

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await requireAssessmentPermission(user, "assessments.review");
  const items = await listReviewQueue({ id: user.id, role: user.role });
  return jsonOk({ items });
});
