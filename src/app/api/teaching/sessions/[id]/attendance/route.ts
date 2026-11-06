import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { saveAttendance } from "@/lib/teaching/service";

const schema = z
  .object({
    marks: z.array(z.object({ studentId: z.string().min(1), status: z.string().min(1) })).min(1).max(200),
  })
  .strict();

export const PUT = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const result = await saveAttendance({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body.marks);
  return jsonOk(result);
});
