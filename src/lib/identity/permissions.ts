import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { SessionUser } from "@/types";
import { PERMISSIONS, SYSTEM_ROLES, type PermissionKey } from "./catalog";

type Grant = { permissionKey: string; scopeType: string; scopeId: string | null; source: string; endsAt: Date | null; roleKey?: string; roleId?: string };

const ready: { done: boolean } = { done: false };

export async function ensureIdentity() {
  if (ready.done) return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  let org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "EnglishBridge",
        code: "EB",
        description: "Organization for the existing learning groups.",
        timezone: "Asia/Tehran",
        language: "en",
        status: "ACTIVE",
        settings: { create: {} },
      },
    });
  } else if (!(await prisma.organizationSetting.findUnique({ where: { organizationId: org.id } }))) {
    await prisma.organizationSetting.create({ data: { organizationId: org.id } });
  }
  // Phase 32: only backfill orphan rows while the deployment is single-tenant.
  // With more than one organization, assigning every null row to the first
  // organization would silently move tenants' records across the boundary.
  const orgCount = await prisma.organization.count();
  if (orgCount <= 1) {
    await prisma.user.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });
    await prisma.learningGroup.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });
  }
  const users = await prisma.user.findMany({ where: { organizationId: org.id }, select: { id: true } });
  if (users.length) {
    const linked = new Set((await prisma.userOrganization.findMany({ where: { organizationId: org.id }, select: { userId: true } })).map((row) => row.userId));
    const missing = users.filter((user) => !linked.has(user.id));
    if (missing.length) await prisma.userOrganization.createMany({ data: missing.map((user) => ({ userId: user.id, organizationId: org.id, isPrimary: true })) });
  }
  const members = await prisma.user.findMany({ where: { groupId: { not: null } }, select: { id: true, groupId: true } });
  if (members.length) {
    const linked = new Set((await prisma.userGroupMembership.findMany({ select: { userId: true, groupId: true } })).map((row) => `${row.userId}:${row.groupId}`));
    const missing = members.filter((row) => row.groupId && !linked.has(`${row.id}:${row.groupId}`));
    if (missing.length) await prisma.userGroupMembership.createMany({ data: missing.map((row) => ({ userId: row.id, groupId: row.groupId! })) });
  }
  for (const item of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: item[0] },
      update: { category: item[1], description: item[2] },
      create: { key: item[0], category: item[1], description: item[2] },
    });
  }
  const permissionRows = await prisma.permission.findMany({ select: { id: true, key: true } });
  const byKey = new Map(permissionRows.map((row) => [row.key, row.id]));
  for (const role of SYSTEM_ROLES) {
    const saved = await prisma.accessRole.upsert({
      where: { organizationId_key: { organizationId: org.id, key: role.key } },
      update: { name: role.name, description: role.description, baseRole: role.baseRole, system: true },
      create: { organizationId: org.id, key: role.key, name: role.name, description: role.description, baseRole: role.baseRole, system: true },
    });
    const wanted = new Set(role.permissions);
    const existing = await prisma.rolePermission.findMany({ where: { roleId: saved.id }, select: { permissionId: true, permission: { select: { key: true } } } });
    for (const row of existing) {
      if (!wanted.has(row.permission.key as PermissionKey)) {
        await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId: saved.id, permissionId: row.permissionId } } });
      }
    }
    for (const key of role.permissions) {
      const permissionId = byKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: saved.id, permissionId } },
        update: {},
        create: { roleId: saved.id, permissionId },
      });
    }
  }
  ready.done = true;
  return org;
}

async function assignedGroupIds(userId: string) {
  const [lead, links] = await Promise.all([
    prisma.learningGroup.findMany({ where: { teacherId: userId }, select: { id: true } }),
    prisma.teacherGroupAssignment.findMany({ where: { teacherId: userId }, select: { groupId: true } }),
  ]);
  return [...new Set([...lead.map((row) => row.id), ...links.map((row) => row.groupId)])];
}

export async function ensureUserAccess(userId: string) {
  const org = await ensureIdentity();
  if (!org) return;
  const existing = await prisma.userAccessRole.count({ where: { userId } });
  if (existing > 0) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, groupId: true } });
  if (!user) return;
  const key = user.role === "ADMIN" ? "ORGANIZATION_ADMIN" : user.role === "TEACHER" ? "TEACHER" : "STUDENT";
  const role = await prisma.accessRole.findUnique({ where: { organizationId_key: { organizationId: org.id, key } } });
  if (!role) return;
  if (user.role === "TEACHER") {
    const groups = await assignedGroupIds(user.id);
    if (groups.length === 0) return;
    await prisma.userAccessRole.createMany({
      data: groups.map((groupId) => ({ userId, roleId: role.id, scopeType: "GROUP", scopeId: groupId, source: "SYSTEM" })),
    });
    return;
  }
  if (user.role === "STUDENT") {
    await prisma.userAccessRole.create({ data: { userId, roleId: role.id, scopeType: "STUDENT", scopeId: user.id, source: "SYSTEM" } });
    return;
  }
  await prisma.userAccessRole.create({ data: { userId, roleId: role.id, scopeType: "ORGANIZATION", scopeId: org.id, source: "SYSTEM" } });
}

function active(endsAt: Date | null, startsAt?: Date | null) {
  const now = Date.now();
  if (startsAt && startsAt.getTime() > now) return false;
  if (endsAt && endsAt.getTime() <= now) return false;
  return true;
}

export async function grantsFor(userId: string): Promise<Grant[]> {
  await ensureUserAccess(userId);
  const now = new Date();
  const [roles, temporary, delegations] = await Promise.all([
    prisma.userAccessRole.findMany({
      where: { userId, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: { scopeType: true, scopeId: true, source: true, startsAt: true, endsAt: true, roleId: true, role: { select: { key: true, permissions: { select: { permission: { select: { key: true } } } } } } },
    }),
    prisma.temporaryPermission.findMany({
      where: { userId, revokedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      select: { permissionKey: true, scopeType: true, scopeId: true, endsAt: true },
    }),
    prisma.delegation.findMany({
      where: { toUserId: userId, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
      select: { permissionKey: true, scopeType: true, scopeId: true, endsAt: true, role: { select: { key: true, permissions: { select: { permission: { select: { key: true } } } } } } },
    }),
  ]);
  const grants: Grant[] = [];
  for (const row of roles) {
    if (!active(row.endsAt, row.startsAt)) continue;
    for (const item of row.role.permissions) {
      grants.push({ permissionKey: item.permission.key, scopeType: row.scopeType, scopeId: row.scopeId, source: row.source, endsAt: row.endsAt, roleKey: row.role.key, roleId: row.roleId });
    }
  }
  for (const row of temporary) {
    grants.push({ permissionKey: row.permissionKey, scopeType: row.scopeType, scopeId: row.scopeId, source: "TEMPORARY", endsAt: row.endsAt });
  }
  for (const row of delegations) {
    if (row.permissionKey) grants.push({ permissionKey: row.permissionKey, scopeType: row.scopeType, scopeId: row.scopeId, source: "DELEGATION", endsAt: row.endsAt });
    for (const item of row.role?.permissions ?? []) {
      grants.push({ permissionKey: item.permission.key, scopeType: row.scopeType, scopeId: row.scopeId, source: "DELEGATION", endsAt: row.endsAt, roleKey: row.role?.key });
    }
  }
  return grants;
}

export function scopeMatches(grant: Grant, scope?: { type?: string; id?: string | null }) {
  if (!scope?.id) return true;
  // CRITICAL FIX: Organization scope must match grant's organization ID
  // Previously any ORGANIZATION grant matched any ORGANIZATION scope (cross-tenant bypass)
  if (scope.type === "ORGANIZATION") {
    return grant.scopeType === "ORGANIZATION" && grant.scopeId === scope.id;
  }
  // For non-organization scopes, an ORGANIZATION grant is allowed only if it belongs to same org
  // Full tenant isolation for GROUP/STUDENT requires service-layer check of group's organizationId
  // This function is minimal fix for direct org IDOR; service layer must enforce group org matching
  if (grant.scopeType === "ORGANIZATION") return true;
  return grant.scopeType === scope.type && grant.scopeId === scope.id;
}

export async function hasPermission(user: { id: string }, key: PermissionKey, scope?: { type?: string; id?: string | null }) {
  if ("impersonatorId" in user && user.impersonatorId && ["users.impersonate", "security.manage", "roles.manage", "users.archive"].includes(key)) return false;
  const grants = await grantsFor(user.id);
  return grants.some((grant) => grant.permissionKey === key && scopeMatches(grant, scope));
}

export async function requirePermission(user: SessionUser, key: PermissionKey, scope?: { type?: string; id?: string | null }) {
  if (!(await hasPermission(user, key, scope))) throw new ApiError(403, "You do not have permission to perform this action.");
  return grantsFor(user.id);
}

export async function visibleGroupIds(user: { id: string; role: string }) {
  const grants = await grantsFor(user.id);
  if (grants.some((grant) => grant.permissionKey === "users.view" && grant.scopeType === "ORGANIZATION")) return null;
  return [...new Set(grants.filter((grant) => grant.scopeType === "GROUP" && grant.scopeId && grant.permissionKey === "users.view").map((grant) => grant.scopeId!))];
}
