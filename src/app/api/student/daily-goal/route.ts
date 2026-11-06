import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { getDailyGoal, getDailyProgress, setDailyGoal, getDailyActivityHistory, getSpeakingStats } from "@/lib/daily-goals";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => {
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const [goal, progress, history, speaking] = await Promise.all([
    getDailyGoal(viewer.id),
    getDailyProgress(viewer.id, new Date()),
    getDailyActivityHistory(viewer.id, 7),
    getSpeakingStats(viewer.id, new Date()),
  ]);
  return jsonOk({ goal, progress, history, speaking });
});

const BodySchema = z.object({
  type: z.enum(["LESSONS", "REVIEW_CARDS", "ACTIVITIES"]),
  value: z.number().int().min(1).max(50),
  enabled: z.boolean(),
});

export const PATCH = apiRoute(async (req) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const raw = await parseJsonBody(req);
  const input = BodySchema.parse(raw);
  const goal = await setDailyGoal(viewer.id, { type: input.type, value: input.value, enabled: input.enabled });
  const progress = await getDailyProgress(viewer.id, new Date());
  return jsonOk({ goal, progress });
});

export const POST = PATCH;
