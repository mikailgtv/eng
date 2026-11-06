import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setDailyMinutes } from "@/lib/adaptive/service";

const schema = z.object({ minutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]) }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  const plan = await setDailyMinutes(user.id, body.minutes);
  return jsonOk({ minutes: plan && "minutes" in plan ? plan.minutes : body.minutes });
});
