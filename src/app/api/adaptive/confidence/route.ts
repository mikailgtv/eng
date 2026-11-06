import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setConfidence } from "@/lib/adaptive/service";

const schema = z.object({
  knowledgeItemId: z.string().min(1),
  level: z.enum(["NOT_SURE", "SOMEWHAT_SURE", "VERY_SURE"]),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await setConfidence(user.id, body.knowledgeItemId, body.level));
});
