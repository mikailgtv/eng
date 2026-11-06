import { getSessionUser } from "../auth";
import { hasPermission } from "../identity/permissions";
import { prisma } from "../prisma";

export type IntegrationPermission = "integrations.view" | "integrations.manage" | "integrations.sync";

/** Server-side Phase 15 permission enforcement for enterprise integration surfaces. */
export async function authorizeIntegration(permission: IntegrationPermission) {
  const user = await getSessionUser();
  if (!user) return { user: null, organizationId: null, allowed: false as const };
  const allowed = await hasPermission(user, permission);
  const memberships = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
  const organizationId = memberships?.organizationId || memberships?.organizationLinks[0]?.organizationId || null;
  return { user, organizationId, allowed: allowed && !!organizationId };
}
