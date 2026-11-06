import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { applyDormantPolicy, identityAnalytics, securitySummary } from "@/lib/identity/service";

export const GET = apiRoute(async (req) => {
  const actor = await requireApiUser();
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind === "analytics") return jsonOk(await identityAnalytics(actor));
  return jsonOk(await securitySummary(actor));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { confirm?: boolean };
  return jsonOk(await applyDormantPolicy(actor, Boolean(body.confirm)));
});
