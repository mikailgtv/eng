import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { grantTeacher, revokeTeacher, setLeadTeacher } from "@/lib/teaching/service";

const schema = z
  .object({
    action: z.enum(["lead", "grant", "revoke"]),
    teacherId: z.string().nullable(),
  })
  .strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  if (body.action === "lead") await setLeadTeacher(viewer, ctx.params.id, body.teacherId);
  else if (body.action === "grant") {
    if (!body.teacherId) return jsonOk({ ok: false });
    await grantTeacher(viewer, ctx.params.id, body.teacherId);
  } else if (body.teacherId) {
    await revokeTeacher(viewer, ctx.params.id, body.teacherId);
  }
  return jsonOk({ ok: true });
});
