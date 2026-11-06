import { z } from "zod";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { setSetting } from "@/lib/ai/settings";
import { assertGroupAccess } from "@/lib/teaching/access";

const schema = z.object({
  scopeKey: z.string().min(1),
  key: z.enum(["enabled", "dailyRequestLimit", "maxResponseChars", "allowedModes", "translationEnabled", "conversationEnabled", "defaultDifficulty"]),
  value: z.string().max(200),
}).strict();

const TEACHER_KEYS = new Set(["enabled", "translationEnabled", "conversationEnabled", "defaultDifficulty"]);

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  if (user.role === "TEACHER") {
    if (body.scopeKey === "GLOBAL" || !TEACHER_KEYS.has(body.key)) throw new ApiError(403, "Teachers cannot change organization tutor settings.");
    await assertGroupAccess({ id: user.id, role: user.role, groupId: user.groupId }, body.scopeKey);
  }
  if (body.key === "dailyRequestLimit" && (Number(body.value) < 1 || Number(body.value) > 200)) {
    throw new ApiError(422, "Daily limit must be between 1 and 200.");
  }
  await setSetting(body.scopeKey, body.key, body.value, user.id);
  await audit({ actorId: user.id, action: "AI_SETTING_CHANGED", entityType: "AI", entityId: body.scopeKey, metadata: { key: body.key } });
  return jsonOk({ ok: true });
});
