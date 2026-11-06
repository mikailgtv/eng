import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { voiceUsage } from "@/lib/voice/service";
import { sttConfig, ttsConfig } from "@/lib/voice/providers";

export const GET = apiRoute(async () => {
  await requireApiUser(["ADMIN"]);
  const usage = await voiceUsage();
  return jsonOk({
    ...usage,
    sttExternalConfigured: sttConfig().externalConfigured,
    ttsExternalConfigured: ttsConfig().externalConfigured,
  });
});
