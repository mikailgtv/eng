import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { endTutorSession } from "@/lib/ai/service";

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const summary = await endTutorSession(user.id, ctx.params.id);
  return jsonOk({ summary });
});
