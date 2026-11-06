import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assignAccessRole, createCustomRole, permissionMatrix, revokeAccessRole } from "@/lib/identity/service";
import type { PermissionKey } from "@/lib/identity/catalog";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  return jsonOk(await permissionMatrix(actor));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { action?: string; name?: string; key?: string; baseRole?: "STUDENT" | "TEACHER" | "ADMIN"; permissions?: PermissionKey[]; description?: string; userId?: string; roleKey?: string; scopeType?: string; scopeId?: string | null; endsAt?: string | null; assignmentId?: string };
  if (body.action === "assign" && body.userId && body.roleKey) return jsonOk(await assignAccessRole(actor, { userId: body.userId, roleKey: body.roleKey, scopeType: body.scopeType, scopeId: body.scopeId, endsAt: body.endsAt }), 201);
  if (body.action === "revoke" && body.assignmentId) return jsonOk(await revokeAccessRole(actor, body.assignmentId));
  if (!body.name || !body.key || !body.baseRole) {
    const { ApiError } = await import("@/lib/api");
    throw new ApiError(422, "Name, key and base role are required.");
  }
  const permissions = Array.isArray(body.permissions)
    ? body.permissions
    : String(body.permissions ?? "").split(",").map((item) => item.trim()).filter(Boolean) as PermissionKey[];
  return jsonOk(await createCustomRole(actor, { name: body.name, key: body.key, baseRole: body.baseRole, permissions, description: body.description }), 201);
});
