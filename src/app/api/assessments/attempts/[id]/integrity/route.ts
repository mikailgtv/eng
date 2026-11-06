import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { recordIntegrityEvent, integritySummary } from "@/lib/assessment/intelligence/integrity";

interface Ctx {
  params: { id: string };
}

const eventSchema = z.object({
  kind: z.string().min(1).max(50),
}).strict();

export const POST = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["STUDENT"]);
  assertSameOrigin(req);
  const payload = eventSchema.parse(await parseJsonBody(req));
  const result = await recordIntegrityEvent(user.id, ctx.params.id, payload.kind);
  return jsonOk({ saved: Boolean(result), id: result.id });
});

export const GET = apiRoute<Ctx>(async (req, ctx) => {
  await requireApiUser(["TEACHER", "ADMIN"]);
  const summary = await integritySummary(ctx.params.id);
  return jsonOk(summary);
});
