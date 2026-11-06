import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { submitListening } from "@/lib/voice/service";

const schema = z.object({
  answers: z.record(z.string()),
  assignmentId: z.string().optional(),
}).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await submitListening(user, ctx.params.id, body.answers, body.assignmentId));
});
