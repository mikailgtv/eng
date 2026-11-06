import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { endVoiceSession } from "@/lib/voice/service";

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk(await endVoiceSession(user.id, ctx.params.id));
});
