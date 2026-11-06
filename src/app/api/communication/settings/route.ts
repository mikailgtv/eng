import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { channelStatus } from "@/lib/communication/providers";
import { communicationSettings, saveCommunicationSetting } from "@/lib/communication/settings";
import { communicationAnalytics } from "@/lib/communication/hub";

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["ADMIN"]);
  return jsonOk({ settings: await communicationSettings(), channels: channelStatus(), analytics: await communicationAnalytics() });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { key?: string; value?: string; confirm?: boolean };
  if (body.confirm !== true || !body.key || typeof body.value !== "string") throw new ApiError(400, "Confirm the setting change.");
  try {
    await saveCommunicationSetting(user.id, body.key, body.value);
  } catch {
    throw new ApiError(400, "Could not save the setting. Check the value and try again.");
  }
  await audit({ actorId: user.id, action: "COMMUNICATION_SETTING_SAVED", entityType: "COMMUNICATION", entityId: body.key, metadata: { key: body.key, value: body.value } });
  return jsonOk({ key: body.key, value: body.value });
});
