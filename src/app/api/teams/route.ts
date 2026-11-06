import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createTeam, listTeams } from "@/lib/identity/service";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  return jsonOk(await listTeams(actor));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { name: string; code: string; departmentId?: string; managerId?: string };
  return jsonOk(await createTeam(actor, body), 201);
});
