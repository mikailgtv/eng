import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setLifecycle } from "@/lib/identity/service";
import { ACCOUNT_STATUSES, type AccountLifecycle } from "@/lib/identity/catalog";
import { ApiError } from "@/lib/api";

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { status?: string; confirm?: boolean };
  if (!body.status || !ACCOUNT_STATUSES.includes(body.status as AccountLifecycle)) throw new ApiError(422, "Choose a valid account status.");
  return jsonOk(await setLifecycle(actor, ctx.params.id, body.status as AccountLifecycle, Boolean(body.confirm)));
});
