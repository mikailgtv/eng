import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { saveBlock } from "@/lib/teaching/service";

const schema = z.object({ type: z.string().min(1), data: z.unknown() }).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const block = await saveBlock({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, { type: body.type, data: body.data });
  return jsonOk({ id: block.id }, 201);
});
