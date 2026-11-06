import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { moveBlock } from "@/lib/teaching/service";

const schema = z.object({ direction: z.union([z.literal(-1), z.literal(1)]) }).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  await moveBlock({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body.direction);
  return jsonOk({ ok: true });
});
