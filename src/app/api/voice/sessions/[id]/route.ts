import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { getOwnVoiceSession } from "@/lib/voice/service";

export const GET = apiRoute<{ params: { id: string } }>(async (_req, ctx) => {
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk({ session: await getOwnVoiceSession(user.id, ctx.params.id) });
});
