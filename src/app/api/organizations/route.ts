import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { listOrganizations, updateOrganization } from "@/lib/identity/service";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  return jsonOk(await listOrganizations(actor));
});

export const PATCH = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { id: string } & Record<string, unknown>;
  return jsonOk(await updateOrganization(actor, body.id, body));
});
