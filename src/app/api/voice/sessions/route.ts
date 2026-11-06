import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { listOwnVoiceSessions, startVoiceSession } from "@/lib/voice/service";

const schema = z.object({ kind: z.string(), topic: z.string().optional(), lessonId: z.string().optional() }).strict();

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk({ sessions: await listOwnVoiceSessions(user.id) });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  const result = await startVoiceSession(user, body);
  return jsonOk(result, 201);
});
