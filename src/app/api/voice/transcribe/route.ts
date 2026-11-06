import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { externalTranscribe, sttConfig } from "@/lib/voice/providers";

const schema = z.object({ audioBase64: z.string().max(2_000_000).optional() }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  if (!sttConfig().externalConfigured) {
    await prisma.speechRecognitionRequest.create({ data: { studentId: user.id, provider: "external", ok: false } });
    throw new ApiError(422, "Voice recognition is unavailable. You can type your answer instead.");
  }
  try {
    const result = await externalTranscribe(body.audioBase64 ?? "");
    await prisma.speechRecognitionRequest.create({ data: { studentId: user.id, provider: "external", charCount: result.text.length, ok: true } });
    return jsonOk({ text: result.text, confidence: result.confidence, storedAudio: false });
  } catch {
    await prisma.speechRecognitionRequest.create({ data: { studentId: user.id, provider: "external", ok: false } });
    throw new ApiError(503, "I couldn't understand the audio. Please try again.");
  }
});
