import { z } from "zod";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { setVoiceSetting } from "@/lib/voice/settings";
import { assertGroupAccess } from "@/lib/teaching/access";

const schema = z.object({
  scopeKey: z.string().min(1),
  key: z.enum(["enabled", "dailyMinutes", "monthlyMinutes", "maxAudioSec", "teacherTranscripts", "requireConsent", "storeAudio"]),
  value: z.string().max(20),
}).strict();

const TEACHER_KEYS = new Set(["enabled"]);

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  if (user.role === "TEACHER") {
    if (body.scopeKey === "GLOBAL" || !TEACHER_KEYS.has(body.key)) throw new ApiError(403, "Teachers cannot change organization voice settings.");
    await assertGroupAccess(user, body.scopeKey);
  }
  if (body.key === "storeAudio" && body.value === "true") {
    throw new ApiError(422, "Raw audio storage stays off. Transcripts are stored instead.");
  }
  await setVoiceSetting(body.scopeKey, body.key, body.value, user.id);
  await audit({ actorId: user.id, action: "VOICE_SETTING_CHANGED", entityType: "VOICE", entityId: body.scopeKey, metadata: { key: body.key, value: body.value } });
  return jsonOk({ ok: true });
});
