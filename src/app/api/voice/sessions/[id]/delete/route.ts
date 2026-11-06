import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { deleteOwnTranscripts } from "@/lib/voice/service";

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk(await deleteOwnTranscripts(user.id, ctx.params.id));
});
