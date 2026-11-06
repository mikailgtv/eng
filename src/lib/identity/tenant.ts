/**
 * Phase 32 — authoritative tenant-scope helper.
 *
 * Why this exists: several Phase 32 "organization checks" read
 * `viewer.organizationId` off the session object, but `SessionUser` never
 * carried that field, so the conditions evaluated `undefined` and were
 * skipped. Every protected operation must instead resolve the actor's tenant
 * from the database and compare it to the *target record's* tenant.
 *
 * Rules (fail closed):
 *  - actor org === target org              -> allowed
 *  - target org is unknown (null/legacy)   -> allowed only when the deployment
 *    has a single organization, otherwise denied (ambiguous record is never
 *    attached to an arbitrary tenant)
 *  - actor org !== target org              -> allowed only for SUPER_ADMIN,
 *    and every such access is audited
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function actorOrgId(actor: { id: string }): Promise<string | null> {
  const row = await prisma.user.findUnique({ where: { id: actor.id }, select: { organizationId: true } });
  return row?.organizationId ?? null;
}

export async function isSuperAdmin(actor: { id: string }): Promise<boolean> {
  const grants = await prisma.userAccessRole.findMany({
    where: { userId: actor.id, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    select: { role: { select: { key: true } } },
  });
  return grants.some((g) => g.role?.key === "SUPER_ADMIN");
}

async function organizationCount(): Promise<number> {
  return prisma.organization.count();
}

/**
 * Assert the actor may act on a record belonging to `targetOrgId`.
 * Throws 404 (not 403) so the existence of another tenant's record is not leaked.
 */
export async function assertTenant(actor: { id: string }, targetOrgId: string | null | undefined, context: string) {
  const own = await actorOrgId(actor);
  const target = targetOrgId ?? null;

  if (own && target && own === target) return;

  if (!target) {
    // Legacy/ambiguous record: safe only while there is a single tenant.
    if ((await organizationCount()) <= 1) return;
    if (await isSuperAdmin(actor)) {
      await audit({
        actorId: actor.id,
        action: "TENANT_UNSCOPED_RECORD_ACCESS",
        entityType: "IDENTITY",
        metadata: { context, targetOrg: null, superAdmin: true },
      }).catch(() => {});
      return;
    }
    throw new ApiError(404, "Not found.");
  }

  if (await isSuperAdmin(actor)) {
    await audit({
      actorId: actor.id,
      action: "CROSS_TENANT_ACCESS",
      entityType: "IDENTITY",
      metadata: { context, actorOrg: own, targetOrg: target },
    }).catch(() => {});
    return;
  }

  throw new ApiError(404, "Not found.");
}

/** Resolve the tenant of a course through its level (courses carry no orgId). */
export async function courseOrgId(courseId: string): Promise<string | null> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { level: { select: { organizationId: true } } } });
  return course?.level?.organizationId ?? null;
}

/** Resolve the tenant of a class/group. */
export async function groupOrgId(groupId: string): Promise<string | null> {
  const group = await prisma.learningGroup.findUnique({ where: { id: groupId }, select: { organizationId: true } });
  return group?.organizationId ?? null;
}

/**
 * Restrict a caller-supplied list of user ids to the actor's tenant.
 * Returns ids that actually belong to the actor's organization; the caller
 * must treat any dropped id as a denial rather than silently skipping it.
 */
export async function filterUsersInTenant(actor: { id: string }, userIds: string[]) {
  const own = await actorOrgId(actor);
  if (!own) return { allowed: [] as string[], rejected: userIds.length };
  const rows = await prisma.user.findMany({
    where: { id: { in: userIds }, organizationId: own },
    select: { id: true },
  });
  return { allowed: rows.map((r) => r.id), rejected: userIds.length - rows.length };
}
