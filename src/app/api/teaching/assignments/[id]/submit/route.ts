import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { submitAssignment } from "@/lib/teaching/service";

const schema = z.object({ text: z.string().max(8000) }).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  const row = await submitAssignment({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body.text);
  return jsonOk({ id: row.id, status: row.status });
});
