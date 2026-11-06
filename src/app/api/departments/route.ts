import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createDepartment, listDepartments } from "@/lib/identity/service";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  return jsonOk(await listDepartments(actor));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { name: string; code: string; description?: string; managerId?: string };
  return jsonOk(await createDepartment(actor, body), 201);
});
