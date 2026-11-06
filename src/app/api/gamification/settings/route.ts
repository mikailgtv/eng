import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { saveGamificationSetting } from "@/lib/gamification/service";

const schema = z.object({
  key: z.enum(["enabled", "dailyXpCap", "weeklyGoal", "xp.lesson", "xp.practice", "xp.speaking", "xp.listening", "xp.vocabulary", "xp.assignment", "xp.quiz", "cap.vocabulary", "mascot.enabled", "mascot.cooldownMinutes", "mascot.dailyLimit"]),
  value: z.string().min(1).max(10),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  await saveGamificationSetting(user.id, body.key, body.value);
  return jsonOk({ ok: true });
});
