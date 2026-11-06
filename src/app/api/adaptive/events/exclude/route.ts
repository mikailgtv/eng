import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { excludeEvent } from "@/lib/adaptive/service";

const schema = z.object({ eventId: z.string().min(1), reason: z.string().min(3).max(200) }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await excludeEvent(user, body.eventId, body.reason));
});
