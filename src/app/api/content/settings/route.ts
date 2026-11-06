import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { contentSettings, saveContentSetting } from "@/lib/content/settings";
import { grantReviewer } from "@/lib/content/service";

export const GET = apiRoute(async () => {
  await requireApiUser(["ADMIN"]);
  return jsonOk(await contentSettings());
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { key?: string; value?: string; confirm?: boolean; reviewerId?: string; enabled?: boolean };
  if (body.confirm !== true) throw new ApiError(400, "Confirm the change.");
  if (body.reviewerId) return jsonOk(await grantReviewer(user, body.reviewerId, Boolean(body.enabled)));
  if (!body.key || typeof body.value !== "string") throw new ApiError(400, "Choose a setting.");
  await saveContentSetting(user.id, body.key, body.value);
  await audit({ actorId: user.id, action: "CONTENT_SETTING_SAVED", entityType: "CONTENT", entityId: body.key, metadata: { key: body.key, value: body.value } });
  return jsonOk(await contentSettings());
});
