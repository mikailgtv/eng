import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { addSkill } from "@/lib/adaptive/service";

const schema = z.object({ code: z.string().min(2).max(40), title: z.string().min(2).max(60), parentCode: z.string().max(40).optional() }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await addSkill(user.id, body), 201);
});
