import { getSessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/identity/permissions";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import type { PermissionKey } from "@/lib/identity/catalog";

export async function workflowScope(permission: PermissionKey) {
  const user = await getSessionUser();
  if (!user) return { user: null, organizationId: null, allowed: false } as const;
  const membership = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true, organizationLinks: { select: { organizationId: true, isPrimary: true }, orderBy: { isPrimary: "desc" }, take: 10 } } });
  const organizationId = membership?.organizationId ?? membership?.organizationLinks[0]?.organizationId ?? null;
  const allowed = Boolean(organizationId && await hasPermission(user, permission, { type: "ORGANIZATION", id: organizationId }));
  return { user, organizationId, allowed };
}

export async function requireWorkflowAccess(permission: PermissionKey): Promise<{ user: SessionUser; organizationId: string }> {
  const scope = await workflowScope(permission);
  if (!scope.user) throw new ApiError(401, "You need to sign in to continue.");
  if (!scope.organizationId || !scope.allowed) throw new ApiError(403, "You do not have permission to access workflow automation.");
  return { user: scope.user, organizationId: scope.organizationId };
}
