import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { rebuildStudent } from "@/lib/adaptive/service";

const schema = z.object({ studentId: z.string().min(1) }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await rebuildStudent(user, body.studentId));
});
