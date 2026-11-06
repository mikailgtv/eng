import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { bulkUsers } from "@/lib/identity/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { action: string; userIds: string[]; confirm?: boolean; groupId?: string; role?: "STUDENT" | "TEACHER" | "ADMIN"; courseId?: string; message?: string };
  return jsonOk(await bulkUsers(actor, { ...body, confirm: Boolean(body.confirm) }));
});
