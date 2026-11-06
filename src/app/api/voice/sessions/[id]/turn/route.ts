import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { recordTurn } from "@/lib/voice/service";

const schema = z.object({
  target: z.string().max(200).optional(),
  transcript: z.string().max(500).nullable().optional(),
  source: z.enum(["TYPED", "STT"]),
  provider: z.string().max(40).optional(),
  providerConfidence: z.number().min(0).max(1).nullable().optional(),
  retry: z.boolean().optional(),
}).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  return jsonOk(await recordTurn(user, ctx.params.id, body));
});
