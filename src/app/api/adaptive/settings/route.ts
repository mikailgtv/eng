import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { saveAdaptiveSetting } from "@/lib/adaptive/service";

const schema = z.object({
  key: z.enum(["enabled", "reviewIntervals", "dailyMinutes", "maxRecommendations", "aiPersonalization", "teacherOverride", "eventRetentionDays", "weekStartsOn"]),
  value: z.string().min(1).max(40),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  await saveAdaptiveSetting(user.id, body.key, body.value);
  return jsonOk({ ok: true });
});
