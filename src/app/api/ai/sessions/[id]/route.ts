import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { getOwnSession } from "@/lib/ai/service";

export const GET = apiRoute<{ params: { id: string } }>(async (_req, ctx) => {
  const user = await requireApiUser(["STUDENT"]);
  const session = await getOwnSession(user.id, ctx.params.id);
  return jsonOk({ session });
});
