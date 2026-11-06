import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { correctXp } from "@/lib/gamification/service";

const schema = z.object({ transactionId: z.string().min(1), reason: z.string().min(3).max(200) }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await correctXp(user.id, body.transactionId, body.reason));
});
