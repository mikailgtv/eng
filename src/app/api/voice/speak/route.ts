import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { logTts } from "@/lib/voice/service";
import { externalSpeak, ttsConfig } from "@/lib/voice/providers";

const schema = z.object({ text: z.string().min(1).max(400), provider: z.enum(["browser", "external"]).default("browser") }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  await logTts(user.id, body.provider, body.text);
  if (body.provider === "external") {
    const spoken = await externalSpeak(body.text);
    if (!spoken.available) {
      return jsonOk({ available: false, text: body.text, message: "Audio is unavailable. Read the sentence below." });
    }
    return jsonOk({ available: true, audioBase64: spoken.audioBase64 });
  }
  return jsonOk({ available: ttsConfig().browserAvailable, text: body.text, useBrowser: true });
});
