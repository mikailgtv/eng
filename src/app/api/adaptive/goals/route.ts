import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setStudentGoal } from "@/lib/adaptive/service";

const schema = z.object({ text: z.string().min(2).max(120), skillCode: z.string().max(40).nullable().optional() }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await setStudentGoal(user.id, body.text, body.skillCode ?? null), 201);
});
