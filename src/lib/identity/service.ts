import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notifyUsers } from "@/lib/teaching/notify";
import type { SessionUser } from "@/types";
import { ACCOUNT_STATUSES, type AccountLifecycle, type PermissionKey } from "./catalog";
import { randomToken, sha256 } from "./crypto";
import { ensureIdentity, grantsFor, hasPermission, requirePermission } from "./permissions";
import { assertPasswordAllowed, orgSettings, recordSecurityEvent, rememberPassword } from "./security";
import { isSuperAdmin as isSuperAdminRole, assertTenant as assertTenantResource } from "./tenant";

const BCRYPT_ROUNDS = 12;

function highestBase(roles: string[]) {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TEACHER")) return "TEACHER";
  return "STUDENT";
}

async function syncBaseRole(userId: string, actorId: string) {
  const rows = await prisma.userAccessRole.findMany({
    where: { userId, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    select: { role: { select: { baseRole: true, key: true } } },
  });
  const next = rows.length ? highestBase(rows.map((row) => row.role.baseRole)) : "STUDENT";
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, username: true, status: true } });
  if (!current || current.role === next) return current;
  if (current.role === "ADMIN" && next !== "ADMIN") {
    const others = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE", id: { not: userId } } });
    if (others === 0) throw new ApiError(400, "At least one active administrator must remain.");
  }
  await prisma.user.update({ where: { id: userId }, data: { role: next } });
  await audit({ actorId, action: "ROLE_CHANGED", entityType: "IDENTITY", entityId: userId, metadata: { from: current.role, to: next, username: current.username } });
  const reviewer = rows.some((row) => row.role.key === "REVIEWER" || row.role.key === "TRAINING_ADMIN" || row.role.key === "ORGANIZATION_ADMIN" || row.role.key === "SUPER_ADMIN");
  if (next === "TEACHER") await prisma.user.update({ where: { id: userId }, data: { contentReviewer: reviewer } });
  return current;
}

export async function listOrganizations(actor: SessionUser) {
  // Tenant isolation: only list orgs actor has permission for
  const grants = await grantsFor(actor.id);
  const orgGrants = grants.filter(g => g.permissionKey === "organizations.manage" && g.scopeType === "ORGANIZATION" && g.scopeId);
  if (orgGrants.length === 0) {
    // Check if has org manage without specific scope? For backward compat, check any org manage grant
    const hasAny = await hasPermission(actor, "organizations.manage");
    if (!hasAny) throw new ApiError(403, "You do not have permission to perform this action.");
    // If has permission but no specific org grants (e.g., legacy), return only actor's org
    const actorUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { organizationId: true } });
    const orgId = actorUser?.organizationId;
    if (!orgId) return [];
    return prisma.organization.findMany({ where: { id: orgId }, orderBy: { name: "asc" }, include: { settings: true, _count: { select: { users: true, groups: true, departments: true } } } });
  }
  const orgIds = [...new Set(orgGrants.map(g => g.scopeId!))];
  return prisma.organization.findMany({ where: { id: { in: orgIds } }, orderBy: { name: "asc" }, include: { settings: true, _count: { select: { users: true, groups: true, departments: true } } } });
}

export async function updateOrganization(actor: SessionUser, id: string, input: Record<string, unknown>) {
  // Enforce tenant scope: require permission for this specific org ID
  await requirePermission(actor, "organizations.manage", { type: "ORGANIZATION", id });
  // Additional check: actor's organization must match target, unless SUPER_ADMIN with explicit audit
  const actorUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { organizationId: true } });
  const targetOrg = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
  if (!targetOrg) throw new ApiError(404, "Organization not found.");
  if (actorUser?.organizationId && actorUser.organizationId !== id) {
    // Check if actor is SUPER_ADMIN (explicit narrow exception)
    const grants = await grantsFor(actor.id);
    const isSuperAdmin = grants.some(g => g.roleKey === "SUPER_ADMIN" && g.scopeType === "ORGANIZATION");
    if (!isSuperAdmin) {
      throw new ApiError(403, "You do not have permission to modify this organization.");
    }
    // SUPER_ADMIN cross-tenant access is audited explicitly
    await audit({ actorId: actor.id, action: "ORGANIZATION_CROSS_TENANT_ACCESS", entityType: "IDENTITY", entityId: id, metadata: { actorOrg: actorUser.organizationId, targetOrg: id, superAdmin: true } });
  }
  const settings = typeof input.settings === "object" && input.settings ? input.settings as Record<string, unknown> : {};
  const org = await prisma.organization.update({
    where: { id },
    data: {
      name: typeof input.name === "string" ? input.name.trim() : undefined,
      description: typeof input.description === "string" ? input.description : undefined,
      logoPath: typeof input.logoPath === "string" && input.logoPath.startsWith("/") ? input.logoPath : undefined,
      status: input.status === "ACTIVE" || input.status === "INACTIVE" ? input.status : undefined,
      timezone: typeof input.timezone === "string" ? input.timezone : undefined,
      language: typeof input.language === "string" ? input.language : undefined,
    },
  });
  if (Object.keys(settings).length) {
    const data = {
      passwordMinLength: numberOr(settings.passwordMinLength),
      passwordRequireUpper: boolOr(settings.passwordRequireUpper),
      passwordRequireLower: boolOr(settings.passwordRequireLower),
      passwordRequireNumber: boolOr(settings.passwordRequireNumber),
      passwordRequireSpecial: boolOr(settings.passwordRequireSpecial),
      passwordHistory: numberOr(settings.passwordHistory),
      passwordExpiryDays: numberOr(settings.passwordExpiryDays),
      mfaMode: settings.mfaMode === "OFF" || settings.mfaMode === "REQUIRED" || settings.mfaMode === "OPTIONAL" ? settings.mfaMode : undefined,
      lockoutThreshold: numberOr(settings.lockoutThreshold),
      lockoutMinutes: numberOr(settings.lockoutMinutes),
      progressiveDelay: boolOr(settings.progressiveDelay),
      dormantDays: numberOr(settings.dormantDays),
      dormantAutoSuspend: boolOr(settings.dormantAutoSuspend),
      sessionMaxDays: numberOr(settings.sessionMaxDays),
      trainingJson: jsonOr(settings.training),
      coursesJson: jsonOr(settings.courses),
      notificationsJson: jsonOr(settings.notifications),
      aiJson: jsonOr(settings.ai),
      certificatesJson: jsonOr(settings.certificates),
      gamificationJson: jsonOr(settings.gamification),
      reportsJson: jsonOr(settings.reports),
    };
    await prisma.organizationSetting.update({ where: { organizationId: id }, data });
  }
  await audit({ actorId: actor.id, action: "ORGANIZATION_CHANGED", entityType: "IDENTITY", entityId: id, metadata: { name: org.name } });
  return org;
}

function numberOr(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : undefined;
}
function boolOr(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
function jsonOr(value: unknown) {
  return value && typeof value === "object" ? JSON.stringify(value) : undefined;
}

export async function listDepartments(actor: SessionUser) {
  await requirePermission(actor, "departments.manage");
  const org = await ensureIdentity();
  return prisma.department.findMany({
    where: { organizationId: org?.id },
    include: { manager: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { members: true, groups: true, teams: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(actor: SessionUser, input: { name: string; code: string; description?: string; managerId?: string }) {
  await requirePermission(actor, "departments.manage");
  const org = await ensureIdentity();
  if (!org) throw new ApiError(500, "Organization is not ready.");
  const row = await prisma.department.create({
    data: { organizationId: org.id, name: input.name.trim(), code: input.code.trim().toUpperCase(), description: input.description ?? null, managerId: input.managerId || null },
  });
  await audit({ actorId: actor.id, action: "DEPARTMENT_CREATED", entityType: "IDENTITY", entityId: row.id, metadata: { name: row.name, code: row.code } });
  return row;
}

export async function listTeams(actor: SessionUser) {
  await requirePermission(actor, "departments.manage");
  return prisma.team.findMany({ include: { department: { select: { name: true } } }, orderBy: { name: "asc" } });
}

export async function createTeam(actor: SessionUser, input: { name: string; code: string; departmentId?: string; managerId?: string }) {
  await requirePermission(actor, "departments.manage");
  const org = await ensureIdentity();
  if (!org) throw new ApiError(500, "Organization is not ready.");
  const row = await prisma.team.create({
    data: { organizationId: org.id, departmentId: input.departmentId || null, name: input.name.trim(), code: input.code.trim().toUpperCase(), managerId: input.managerId || null },
  });
  await audit({ actorId: actor.id, action: "TEAM_CREATED", entityType: "IDENTITY", entityId: row.id, metadata: { name: row.name } });
  return row;
}

export async function setGroupHierarchy(actor: SessionUser, groupId: string, input: { parentId?: string | null; code?: string | null; departmentId?: string | null; managerId?: string | null }) {
  await requirePermission(actor, "groups.manage");
  if (input.parentId === groupId) throw new ApiError(422, "A group cannot be its own parent.");
  const row = await prisma.learningGroup.update({
    where: { id: groupId },
    data: {
      parentId: input.parentId === undefined ? undefined : input.parentId,
      code: input.code === undefined ? undefined : input.code,
      departmentId: input.departmentId === undefined ? undefined : input.departmentId,
      managerId: input.managerId === undefined ? undefined : input.managerId,
    },
  });
  await audit({ actorId: actor.id, action: "GROUP_UPDATED", entityType: "GROUP", entityId: groupId, metadata: { code: row.code, parentId: row.parentId } });
  return { id: row.id, name: row.name, code: row.code, parentId: row.parentId, departmentId: row.departmentId, managerId: row.managerId, status: row.status };
}

export async function searchUsers(actor: SessionUser, query: { q?: string; role?: string; status?: string; groupId?: string; departmentId?: string; page?: number }) {
  await requirePermission(actor, "users.view");
  const grants = await grantsFor(actor.id);
  const orgWide = grants.some((grant) => grant.permissionKey === "users.view" && grant.scopeType === "ORGANIZATION");
  const groupIds = grants.filter((grant) => grant.permissionKey === "users.view" && grant.scopeType === "GROUP" && grant.scopeId).map((grant) => grant.scopeId!);
  const studentIds = grants.filter((grant) => grant.permissionKey === "users.view" && grant.scopeType === "STUDENT" && grant.scopeId).map((grant) => grant.scopeId!);
  if (!orgWide && groupIds.length === 0 && studentIds.length === 0) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  const page = Math.max(1, query.page ?? 1);
  const pageSize = 20;
  const where = {
    AND: [
      orgWide ? {} : { OR: [{ groupId: { in: groupIds } }, { id: { in: studentIds } }, { id: actor.id }] },
      query.role ? { role: query.role } : {},
      query.status ? { status: query.status } : {},
      query.groupId ? { groupId: query.groupId } : {},
      query.departmentId ? { departmentId: query.departmentId } : {},
      query.q ? { OR: ["firstName", "lastName", "username", "email", "employeeCode"].map((field) => ({ [field]: { contains: query.q } })) } : {},
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, username: true, email: true, employeeCode: true, role: true, status: true, groupId: true, departmentId: true, lastLoginAt: true, englishLevel: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function userInScope(actor: SessionUser, userId: string) {
  if (actor.id === userId) return true;
  const grants = await grantsFor(actor.id);
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { groupId: true, organizationId: true } });
  if (!target) return false;

  // Phase 32: an ORGANIZATION-scoped grant only reaches users of the ACTOR'S
  // tenant. Previously any organization grant matched every organization,
  // which let an administrator read another tenant's learner records by id.
  const hasOrgWide = grants.some((grant) => grant.permissionKey === "users.view" && grant.scopeType === "ORGANIZATION");
  if (hasOrgWide) {
    if (actor.organizationId && target.organizationId && actor.organizationId === target.organizationId) return true;
    if (await isSuperAdminRole(actor)) {
      await audit({
        actorId: actor.id,
        action: "CROSS_TENANT_ACCESS",
        entityType: "USER",
        entityId: userId,
        metadata: { context: "users.view", actorOrg: actor.organizationId ?? null, targetOrg: target.organizationId ?? null },
      }).catch(() => {});
      return true;
    }
    return false;
  }

  if (!target.groupId) return false;
  return grants.some((grant) => grant.permissionKey === "users.view" && grant.scopeType === "GROUP" && grant.scopeId === target.groupId);
}

export async function userDetail(actor: SessionUser, userId: string) {
  if (!(await userInScope(actor, userId))) throw new ApiError(404, "User not found.");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true, username: true, email: true, employeeCode: true, role: true, status: true,
      englishLevel: true, groupId: true, departmentId: true, organizationId: true, phone: true, jobTitle: true, timezone: true,
      preferredLanguage: true, lastLoginAt: true, createdAt: true, mustChangePassword: true, lockedUntil: true, contentReviewer: true,
      group: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      profile: true,
    },
  });
  if (!user) throw new ApiError(404, "User not found.");
  const [progress, attendance, assessments, assignments, speaking, listening, certificates, xp, notifications, grants, sessions] = await Promise.all([
    prisma.lessonProgress.count({ where: { studentId: userId, status: "COMPLETED" } }),
    prisma.attendanceRecord.count({ where: { studentId: userId } }),
    prisma.assessmentAttempt.count({ where: { studentId: userId } }),
    prisma.assignmentSubmission.count({ where: { studentId: userId } }),
    prisma.speechAttempt.count({ where: { studentId: userId } }),
    prisma.listeningAttempt.count({ where: { studentId: userId } }),
    prisma.certificate.count({ where: { studentId: userId } }),
    prisma.xpTransaction.count({ where: { studentId: userId } }),
    prisma.notification.count({ where: { userId } }),
    grantsFor(userId),
    prisma.userSession.count({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  const securityAllowed = await hasPermission(actor, "security.view");
  return {
    user,
    counts: { progress, attendance, assessments, assignments, speaking, listening, certificates, xp, notifications, sessions },
    access: grants.map((grant) => ({ permission: grant.permissionKey, scopeType: grant.scopeType, scopeId: grant.scopeId, source: grant.source, endsAt: grant.endsAt, role: grant.roleKey ?? null })),
    security: securityAllowed ? { lockedUntil: user.lockedUntil, mustChangePassword: user.mustChangePassword } : null,
  };
}

export async function setLifecycle(actor: SessionUser, userId: string, status: AccountLifecycle, confirm: boolean) {
  if (!confirm) throw new ApiError(400, "Confirm this account change.");
  if (!ACCOUNT_STATUSES.includes(status)) throw new ApiError(422, "Choose a valid account status.");
  await requirePermission(actor, status === "ACTIVE" ? "users.edit" : "users.archive");
  if (actor.impersonatorId) throw new ApiError(403, "Support access cannot change account status.");
  if (userId === actor.id && status !== "ACTIVE") throw new ApiError(400, "You cannot change your own account status this way.");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new ApiError(404, "User not found.");
  if (target.role === "ADMIN" && status !== "ACTIVE") {
    const others = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE", id: { not: userId } } });
    if (others === 0) throw new ApiError(400, "At least one active administrator must remain.");
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      archivedAt: status === "ARCHIVED" ? new Date() : status === "ACTIVE" ? null : undefined,
      suspendedAt: status === "SUSPENDED" ? new Date() : status === "ACTIVE" ? null : undefined,
      lockedUntil: status === "ACTIVE" ? null : undefined,
      failedLoginCount: status === "ACTIVE" ? 0 : undefined,
    },
  });
  if (status !== "ACTIVE") await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ actorId: actor.id, action: status === "ACTIVE" ? "USER_RESTORED" : "USER_STATUS_CHANGED", entityType: "IDENTITY", entityId: userId, metadata: { from: target.status, to: status, username: target.username } });
  await notifyUsers([userId], { type: "SECURITY", category: "SECURITY", title: "Account status changed", body: `Your account status is now ${status}.`, href: "/student/security", source: "identity" });
  return { id: updated.id, status: updated.status };
}

export async function assignAccessRole(actor: SessionUser, input: { userId: string; roleKey: string; scopeType?: string; scopeId?: string | null; endsAt?: string | null }) {
  await requirePermission(actor, "roles.manage");
  if (actor.impersonatorId) throw new ApiError(403, "Support access cannot change roles.");
  const org = await ensureIdentity();
  const role = await prisma.accessRole.findFirst({ where: { organizationId: org?.id, key: input.roleKey, status: "ACTIVE" } });
  if (!role) throw new ApiError(404, "Role not found.");

  // Prevent arbitrary tenant assignment of SUPER_ADMIN
  if (role.key === "SUPER_ADMIN") {
    const actorGrants = await grantsFor(actor.id);
    const actorIsSuperAdmin = actorGrants.some(g => g.roleKey === "SUPER_ADMIN");
    if (!actorIsSuperAdmin) {
      throw new ApiError(403, "Only SUPER_ADMIN can assign SUPER_ADMIN role.");
    }
    // Explicit audited exception for cross-tenant SUPER_ADMIN assignment
    await audit({ actorId: actor.id, action: "SUPER_ADMIN_ASSIGNMENT_ATTEMPT", entityType: "IDENTITY", entityId: input.userId, metadata: { role: role.key, actorIsSuperAdmin: true } });
  }

  // Validate target user belongs to same organization
  const actorUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { organizationId: true } });
  const targetUser = await prisma.user.findUnique({ where: { id: input.userId }, select: { organizationId: true, role: true } });
  if (!targetUser) throw new ApiError(404, "Target user not found.");
  if (actorUser?.organizationId && targetUser.organizationId && actorUser.organizationId !== targetUser.organizationId) {
    const actorGrants = await grantsFor(actor.id);
    const isSuperAdmin = actorGrants.some(g => g.roleKey === "SUPER_ADMIN");
    if (!isSuperAdmin) {
      throw new ApiError(403, "Cannot assign role to user in different organization.");
    }
    await audit({ actorId: actor.id, action: "ROLE_CROSS_TENANT_ASSIGNMENT", entityType: "IDENTITY", entityId: input.userId, metadata: { actorOrg: actorUser.organizationId, targetOrg: targetUser.organizationId, role: role.key } });
  }

  // Validate scopeType/scopeId to prevent spoofing
  const scopeType = input.scopeType ?? "ORGANIZATION";
  let scopeId = input.scopeId ?? org?.id ?? null;

  if (scopeType === "ORGANIZATION") {
    // Must be actor's organization, not arbitrary
    if (actorUser?.organizationId && scopeId && scopeId !== actorUser.organizationId) {
      const actorGrants = await grantsFor(actor.id);
      const isSuperAdmin = actorGrants.some(g => g.roleKey === "SUPER_ADMIN");
      if (!isSuperAdmin) {
        throw new ApiError(403, "Cannot assign organization scope outside your organization.");
      }
    }
    scopeId = actorUser?.organizationId || org?.id || scopeId;
  } else if (scopeType === "GROUP") {
    if (!scopeId) throw new ApiError(422, "Group scope requires group ID.");
    const group = await prisma.learningGroup.findUnique({ where: { id: scopeId }, select: { organizationId: true } });
    if (!group) throw new ApiError(404, "Group not found.");
    if (actorUser?.organizationId && group.organizationId && group.organizationId !== actorUser.organizationId) {
      throw new ApiError(403, "Cannot assign group scope outside your organization.");
    }
  } else if (scopeType === "STUDENT") {
    if (!scopeId) throw new ApiError(422, "Student scope requires student ID.");
    const student = await prisma.user.findUnique({ where: { id: scopeId }, select: { organizationId: true } });
    if (!student) throw new ApiError(404, "Student not found.");
    if (actorUser?.organizationId && student.organizationId && student.organizationId !== actorUser.organizationId) {
      throw new ApiError(403, "Cannot assign student scope outside your organization.");
    }
  }

  const row = await prisma.userAccessRole.create({
    data: {
      userId: input.userId,
      roleId: role.id,
      scopeType,
      scopeId,
      source: input.endsAt ? "TEMPORARY" : "ASSIGNED",
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      grantedById: actor.id,
    },
  });
  await syncBaseRole(input.userId, actor.id);
  if (role.key === "REVIEWER") await prisma.user.update({ where: { id: input.userId }, data: { contentReviewer: true } });
  await audit({ actorId: actor.id, action: "PERMISSION_GRANTED", entityType: "IDENTITY", entityId: input.userId, metadata: { role: role.key, scopeType: row.scopeType, scopeId: row.scopeId, endsAt: row.endsAt } });
  await notifyUsers([input.userId], { type: "SECURITY", category: "SECURITY", title: "Access updated", body: `You were given the ${role.name} role.`, href: "/student/security", source: "identity" });
  return row;
}

export async function revokeAccessRole(actor: SessionUser, id: string) {
  await requirePermission(actor, "roles.manage");
  const row = await prisma.userAccessRole.findUnique({ where: { id }, include: { role: { select: { key: true, name: true } } } });
  if (!row) throw new ApiError(404, "Assignment not found.");
  await prisma.userAccessRole.delete({ where: { id } });
  await syncBaseRole(row.userId, actor.id);
  await audit({ actorId: actor.id, action: "PERMISSION_REVOKED", entityType: "IDENTITY", entityId: row.userId, metadata: { role: row.role.key } });
  await notifyUsers([row.userId], { type: "SECURITY", category: "SECURITY", title: "Access updated", body: `The ${row.role.name} role was removed.`, href: "/student/security", source: "identity" });
  return { ok: true };
}

export async function createCustomRole(actor: SessionUser, input: { name: string; key: string; baseRole: "STUDENT" | "TEACHER" | "ADMIN"; permissions: PermissionKey[]; description?: string }) {
  await requirePermission(actor, "roles.manage");
  const org = await ensureIdentity();
  const role = await prisma.accessRole.create({
    data: { organizationId: org?.id, key: input.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"), name: input.name.trim(), description: input.description ?? null, baseRole: input.baseRole, system: false },
  });
  const permissions = await prisma.permission.findMany({ where: { key: { in: input.permissions } } });
  if (permissions.length) await prisma.rolePermission.createMany({ data: permissions.map((item) => ({ roleId: role.id, permissionId: item.id })) });
  await audit({ actorId: actor.id, action: "ROLE_CREATED", entityType: "IDENTITY", entityId: role.id, metadata: { key: role.key, permissions: input.permissions } });
  return role;
}

export async function permissionMatrix(actor: SessionUser) {
  await requirePermission(actor, "roles.manage");
  const org = await ensureIdentity();
  const roles = await prisma.accessRole.findMany({
    where: { organizationId: org?.id, status: "ACTIVE" },
    include: { permissions: { select: { permission: { select: { key: true, category: true } } } } },
    orderBy: { name: "asc" },
  });
  return {
    permissions: await prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] }),
    roles: roles.map((role) => ({ id: role.id, key: role.key, name: role.name, baseRole: role.baseRole, system: role.system, permissions: role.permissions.map((item) => item.permission.key) })),
  };
}

export async function grantTemporary(actor: SessionUser, input: { userId: string; permissionKey: PermissionKey; startsAt: string; endsAt: string; scopeType?: string; scopeId?: string | null }) {
  await requirePermission(actor, "roles.manage");
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(endsAt.getTime() > startsAt.getTime())) throw new ApiError(422, "The end date must be after the start date.");
  const row = await prisma.temporaryPermission.create({
    data: { userId: input.userId, permissionKey: input.permissionKey, startsAt, endsAt, scopeType: input.scopeType ?? "ORGANIZATION", scopeId: input.scopeId ?? null, grantedById: actor.id },
  });
  await audit({ actorId: actor.id, action: "PERMISSION_GRANTED", entityType: "IDENTITY", entityId: input.userId, metadata: { permission: input.permissionKey, temporary: true, endsAt: endsAt.toISOString() } });
  return row;
}

export async function createDelegation(actor: SessionUser, input: { fromUserId: string; toUserId: string; endsAt: string; permissionKey?: string; roleKey?: string; reason: string; scopeType?: string; scopeId?: string | null }) {
  await requirePermission(actor, "delegations.manage");
  const org = await ensureIdentity();
  const role = input.roleKey ? await prisma.accessRole.findFirst({ where: { organizationId: org?.id, key: input.roleKey } }) : null;
  if (!input.permissionKey && !role) throw new ApiError(422, "Choose a role or a permission to delegate.");
  const row = await prisma.delegation.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      roleId: role?.id ?? null,
      permissionKey: input.permissionKey ?? null,
      scopeType: input.scopeType ?? "GROUP",
      scopeId: input.scopeId ?? null,
      startsAt: new Date(),
      endsAt: new Date(input.endsAt),
      reason: input.reason,
      createdById: actor.id,
    },
  });
  await audit({ actorId: actor.id, action: "DELEGATION_CREATED", entityType: "IDENTITY", entityId: row.id, metadata: { fromUserId: input.fromUserId, toUserId: input.toUserId, permission: input.permissionKey ?? null, role: input.roleKey ?? null, endsAt: row.endsAt } });
  await notifyUsers([input.toUserId], { type: "SECURITY", category: "SECURITY", title: "Temporary responsibility", body: "An administrator delegated access to you for a limited time.", href: "/teacher/security", source: "identity" });
  return row;
}

export async function createInvitation(actor: SessionUser, input: { email: string; role: "STUDENT" | "TEACHER" | "ADMIN"; accessRoleKey?: string; groupId?: string; departmentId?: string; employeeCode?: string; firstName?: string; lastName?: string }) {
  await requirePermission(actor, "invitations.manage");
  const org = await ensureIdentity();
  if (!org) throw new ApiError(500, "Organization is not ready.");
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const row = await prisma.userInvitation.create({
    data: {
      email: input.email.trim().toLowerCase(),
      tokenHash: sha256(token),
      role: input.role,
      accessRoleKey: input.accessRoleKey ?? (input.role === "ADMIN" ? "ORGANIZATION_ADMIN" : input.role),
      organizationId: org.id,
      groupId: input.groupId ?? null,
      departmentId: input.departmentId ?? null,
      employeeCode: input.employeeCode ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      expiresAt,
      invitedById: actor.id,
    },
  });
  await audit({ actorId: actor.id, action: "USER_INVITED", entityType: "IDENTITY", entityId: row.id, metadata: { email: row.email, role: row.role, groupId: row.groupId } });
  const existing = await prisma.user.findUnique({ where: { email: row.email }, select: { id: true } });
  if (existing) {
    await notifyUsers([existing.id], { type: "SECURITY", category: "SECURITY", title: "Invitation", body: "An invitation was issued for your email. Ask an administrator if you were not expecting it.", href: "/student/security", source: "identity" });
  }
  return { id: row.id, expiresAt, link: `/invite/${token}` };
}

export async function acceptInvitation(input: { token: string; firstName: string; lastName: string; username: string; employeeCode: string; password: string }) {
  const row = await prisma.userInvitation.findUnique({ where: { tokenHash: sha256(input.token) } });
  if (!row || row.usedAt || row.revokedAt) throw new ApiError(400, "This invitation is no longer valid.");
  if (row.expiresAt.getTime() <= Date.now()) throw new ApiError(400, "This invitation has expired.");
  await assertPasswordAllowed(null, input.password);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        username: input.username.trim().toLowerCase(),
        email: row.email,
        employeeCode: input.employeeCode.trim(),
        passwordHash,
        role: row.role,
        status: "ACTIVE",
        organizationId: row.organizationId,
        departmentId: row.departmentId,
        groupId: row.groupId,
        passwordChangedAt: new Date(),
      },
    });
    await tx.userInvitation.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await tx.userOrganization.create({ data: { userId: created.id, organizationId: row.organizationId, isPrimary: true } });
    if (row.groupId) await tx.userGroupMembership.create({ data: { userId: created.id, groupId: row.groupId } });
    return created;
  });
  await rememberPassword(user.id, passwordHash);
  if (row.accessRoleKey) {
    const role = await prisma.accessRole.findFirst({ where: { organizationId: row.organizationId, key: row.accessRoleKey } });
    if (role) {
      await prisma.userAccessRole.create({
        data: { userId: user.id, roleId: role.id, scopeType: row.groupId ? "GROUP" : "ORGANIZATION", scopeId: row.groupId ?? row.organizationId, source: "INVITATION", grantedById: row.invitedById },
      });
    }
  }
  await audit({ actorId: user.id, action: "USER_CREATED", entityType: "IDENTITY", entityId: user.id, metadata: { username: user.username, via: "invitation" } });
  await notifyUsers([row.invitedById], { type: "SECURITY", category: "SECURITY", title: "Invitation accepted", body: `${user.firstName} ${user.lastName} activated an invitation.`, href: "/admin/users", source: "identity" });
  return { id: user.id, username: user.username };
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((item) => item.some(Boolean));
}

export async function previewImport(actor: SessionUser, csv: string) {
  await requirePermission(actor, "users.import");
  const table = parseCsv(csv);
  const [header, ...body] = table;
  if (!header) throw new ApiError(422, "The file is empty.");
  const keys = header.map((item) => item.trim());
  const required = ["firstName", "lastName", "employeeCode", "username", "role"];
  for (const key of required) if (!keys.includes(key)) throw new ApiError(422, `Missing column: ${key}`);
  const errors: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  const rows = [];
  for (let index = 0; index < body.length; index += 1) {
    const values = Object.fromEntries(keys.map((key, i) => [key, body[index][i] ?? ""]));
    const username = values.username.toLowerCase();
    const code = values.employeeCode;
    if (!values.firstName || !values.lastName || !username || !code) errors.push({ row: index + 2, message: "Name, username and employee code are required." });
    if (!["STUDENT", "TEACHER", "ADMIN"].includes(values.role)) errors.push({ row: index + 2, message: "Role must be STUDENT, TEACHER or ADMIN." });
    if (seen.has(username) || seen.has(code)) errors.push({ row: index + 2, message: "Duplicate username or employee code in the file." });
    seen.add(username); seen.add(code);
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { employeeCode: code }, ...(values.email ? [{ email: values.email.toLowerCase() }] : [])] }, select: { id: true } });
    if (existing) errors.push({ row: index + 2, message: "A user with that username, email or employee code already exists." });
    let groupId: string | null = null;
    if (values.groupCode) {
      const group = await prisma.learningGroup.findFirst({ where: { code: values.groupCode }, select: { id: true } });
      if (!group) errors.push({ row: index + 2, message: `Unknown group code ${values.groupCode}.` });
      groupId = group?.id ?? null;
    }
    rows.push({ ...values, username, groupId });
  }
  if (errors.length) return { ok: false, errors, rows: rows.length };
  const batch = await prisma.importBatch.create({
    data: { actorId: actor.id, payload: JSON.stringify(rows), expiresAt: new Date(Date.now() + 30 * 60_000) },
  });
  return { ok: true, token: batch.id, rows: rows.length, errors: [] };
}

export async function confirmImport(actor: SessionUser, token: string, confirm: boolean) {
  if (!confirm) throw new ApiError(400, "Confirm the import.");
  await requirePermission(actor, "users.import");
  const batch = await prisma.importBatch.findUnique({ where: { id: token } });
  if (!batch || batch.actorId !== actor.id || batch.confirmedAt || batch.expiresAt.getTime() < Date.now()) throw new ApiError(400, "This import preview is no longer valid.");
  const rows = JSON.parse(batch.payload) as Array<Record<string, string | null>>;
  const org = await ensureIdentity();
  const created = await prisma.$transaction(async (tx) => {
    const users = [];
    for (const row of rows) {
      const temporary = randomToken(9);
      const passwordHash = await bcrypt.hash(`${temporary}A1`, BCRYPT_ROUNDS);
      const user = await tx.user.create({
        data: {
          firstName: String(row.firstName),
          lastName: String(row.lastName),
          username: String(row.username),
          email: row.email ? String(row.email).toLowerCase() : null,
          employeeCode: String(row.employeeCode),
          role: String(row.role),
          status: "ACTIVE",
          passwordHash,
          mustChangePassword: true,
          organizationId: org?.id,
          groupId: row.groupId ? String(row.groupId) : null,
          passwordChangedAt: new Date(),
        },
      });
      users.push({ id: user.id, username: user.username, temporaryPassword: `${temporary}A1` });
    }
    await tx.importBatch.update({ where: { id: batch.id }, data: { confirmedAt: new Date(), payload: "[]" } });
    return users;
  });
  await audit({ actorId: actor.id, action: "USERS_IMPORTED", entityType: "IDENTITY", entityId: batch.id, metadata: { count: created.length } });
  return { created: created.map((user) => ({ id: user.id, username: user.username, temporaryPassword: user.temporaryPassword })) };
}

export async function bulkUsers(actor: SessionUser, input: { action: string; userIds: string[]; confirm: boolean; groupId?: string; role?: "STUDENT" | "TEACHER" | "ADMIN"; courseId?: string; message?: string }) {
  if (!input.confirm) throw new ApiError(400, "Confirm this bulk action.");
  if (input.userIds.length === 0 || input.userIds.length > 100) throw new ApiError(422, "Choose between 1 and 100 users.");

  // Phase 32: bulk operations are tenant-scoped, and the check runs BEFORE any
  // branch (including notify). Previously updateMany()/notifyUsers() operated on
  // whatever ids the client sent, so an administrator could suspend, re-role,
  // re-group or message another organization's accounts in one request.
  {
    const { filterUsersInTenant } = await import("./tenant");
    const scoped = await filterUsersInTenant(actor, input.userIds);
    if (scoped.rejected > 0) throw new ApiError(404, "One or more selected users were not found.");
    if (input.groupId) {
      const group = await prisma.learningGroup.findUnique({ where: { id: input.groupId }, select: { organizationId: true } });
      await assertTenantResource(actor, group?.organizationId, "bulk.group");
    }
    if (input.courseId) {
      const { courseOrgId } = await import("./tenant");
      await assertTenantResource(actor, await courseOrgId(input.courseId), "bulk.course");
    }
  }

  if (input.action === "notify") {
    await requirePermission(actor, "announcements.create");
    await notifyUsers(input.userIds, { type: "ADMIN", category: "TRAINING", title: "Message from an administrator", body: input.message || "You have a new message.", href: "/student/notifications", source: "identity" });
    return { count: input.userIds.length };
  }
  await requirePermission(actor, input.action === "activate" ? "users.edit" : input.action === "role" ? "roles.manage" : "users.archive");
  if (input.userIds.includes(actor.id) && input.action !== "activate" && input.action !== "notify") throw new ApiError(400, "You cannot include your own account in this action.");
  if (input.action === "suspend") {
    await prisma.user.updateMany({ where: { id: { in: input.userIds }, role: { not: "ADMIN" } }, data: { status: "SUSPENDED", suspendedAt: new Date() } });
  } else if (input.action === "activate") {
    await prisma.user.updateMany({ where: { id: { in: input.userIds } }, data: { status: "ACTIVE", suspendedAt: null, archivedAt: null, lockedUntil: null, failedLoginCount: 0 } });
  } else if (input.action === "group" && input.groupId) {
    await prisma.user.updateMany({ where: { id: { in: input.userIds } }, data: { groupId: input.groupId } });
    const existing = new Set((await prisma.userGroupMembership.findMany({ where: { groupId: input.groupId }, select: { userId: true } })).map((row) => row.userId));
    const missing = input.userIds.filter((userId) => !existing.has(userId));
    if (missing.length) await prisma.userGroupMembership.createMany({ data: missing.map((userId) => ({ userId, groupId: input.groupId! })) });
  } else if (input.action === "role" && input.role) {
    await prisma.user.updateMany({ where: { id: { in: input.userIds }, NOT: { role: "ADMIN", id: actor.id } }, data: { role: input.role } });
  } else if (input.action === "course" && input.courseId) {
    await prisma.contentAssignment.createMany({
      data: input.userIds.map((userId) => ({ resourceType: "COURSE", resourceId: input.courseId!, targetType: "STUDENT", targetId: userId, assignedById: actor.id })),
    });
  } else throw new ApiError(422, "This bulk action is not supported.");
  await audit({ actorId: actor.id, action: "USERS_BULK", entityType: "IDENTITY", metadata: { action: input.action, count: input.userIds.length } });
  return { count: input.userIds.length };
}

export async function applyDormantPolicy(actor: SessionUser, confirm: boolean) {
  if (!confirm) throw new ApiError(400, "Confirm the dormant-account policy.");
  await requirePermission(actor, "security.manage");
  const { settings } = await orgSettings();
  if (!settings.dormantAutoSuspend) return { suspended: 0, enabled: false };
  const before = new Date(Date.now() - settings.dormantDays * 24 * 60 * 60_000);
  const rows = await prisma.user.findMany({
    where: { status: "ACTIVE", role: { not: "ADMIN" }, OR: [{ lastLoginAt: null, createdAt: { lt: before } }, { lastLoginAt: { lt: before } }] },
    select: { id: true },
  });
  if (rows.length) {
    await prisma.user.updateMany({ where: { id: { in: rows.map((row) => row.id) } }, data: { status: "SUSPENDED", suspendedAt: new Date() } });
    await audit({ actorId: actor.id, action: "DORMANT_POLICY_APPLIED", entityType: "IDENTITY", metadata: { count: rows.length, days: settings.dormantDays } });
  }
  return { suspended: rows.length, enabled: true };
}

export async function securitySummary(actor: SessionUser) {
  await requirePermission(actor, "security.view");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const { settings } = await orgSettings();
  const dormantBefore = new Date(Date.now() - settings.dormantDays * 24 * 60 * 60_000);
  const [failed, locked, sessions, mfa, events, dormant, statusGroups, roleGroups] = await Promise.all([
    prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since } } }),
    prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.userSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.mfaMethod.count({ where: { enabled: true } }),
    prisma.accountSecurityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, createdAt: true, user: { select: { firstName: true, lastName: true, username: true } } } }),
    prisma.user.findMany({ where: { status: "ACTIVE", OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: dormantBefore } }] }, select: { id: true, firstName: true, lastName: true, username: true, lastLoginAt: true }, take: 50 }),
    prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  return { failed, locked, sessions, mfa, events, dormant, dormantDays: settings.dormantDays, statusGroups, roleGroups, autoSuspend: settings.dormantAutoSuspend };
}

export async function identityAnalytics(actor: SessionUser) {
  await requirePermission(actor, "reports.view");
  const [active, invited, attendance, participation] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: { in: ["INVITED", "PENDING"] } } }),
    prisma.attendanceRecord.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lessonProgress.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const byGroup = await prisma.learningGroup.findMany({
    select: { id: true, name: true, _count: { select: { members: true, sessions: true } } },
    orderBy: { name: "asc" },
  });
  return { activeUsers: active, pendingActivation: invited, attendance, participation, groups: byGroup };
}

export async function openAccessReview(actor: SessionUser, title: string) {
  await requirePermission(actor, "access.review");
  const org = await ensureIdentity();
  if (!org) throw new ApiError(500, "Organization is not ready.");
  const review = await prisma.accessReview.create({ data: { organizationId: org.id, title, createdById: actor.id } });
  const assignments = await prisma.userAccessRole.findMany({
    where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    select: { id: true, userId: true, scopeType: true, scopeId: true, source: true, endsAt: true, user: { select: { firstName: true, lastName: true, username: true } }, role: { select: { id: true, key: true, name: true } } },
    take: 200,
  });
  await audit({ actorId: actor.id, action: "ACCESS_REVIEW_OPENED", entityType: "IDENTITY", entityId: review.id, metadata: { title } });
  return { review, assignments };
}

export async function decideAccess(actor: SessionUser, input: { reviewId: string; assignmentId: string; action: "KEEP" | "REMOVE" | "EXPIRE"; note?: string }) {
  await requirePermission(actor, "access.review");
  const assignment = await prisma.userAccessRole.findUnique({ where: { id: input.assignmentId } });
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  if (input.action === "REMOVE") await prisma.userAccessRole.delete({ where: { id: assignment.id } });
  if (input.action === "EXPIRE") await prisma.userAccessRole.update({ where: { id: assignment.id }, data: { endsAt: new Date() } });
  const decision = await prisma.accessReviewDecision.create({
    data: { reviewId: input.reviewId, userId: assignment.userId, roleId: assignment.roleId, action: input.action, note: input.note ?? null, actorId: actor.id },
  });
  if (input.action !== "KEEP") await syncBaseRole(assignment.userId, actor.id);
  await audit({ actorId: actor.id, action: "ACCESS_REVIEWED", entityType: "IDENTITY", entityId: assignment.userId, metadata: { action: input.action, reviewId: input.reviewId } });
  return decision;
}

export async function updateOwnPreferences(actor: SessionUser, input: { preferredLanguage?: string; timezone?: string; aiAssistance?: boolean; showTranslations?: boolean; learningPreferences?: string }) {
  await prisma.user.update({
    where: { id: actor.id },
    data: { preferredLanguage: input.preferredLanguage, timezone: input.timezone },
  });
  return prisma.userProfile.upsert({
    where: { userId: actor.id },
    update: {
      preferredLanguage: input.preferredLanguage,
      timezone: input.timezone,
      aiAssistance: input.aiAssistance,
      showTranslations: input.showTranslations,
      learningPreferences: input.learningPreferences,
    },
    create: { userId: actor.id, preferredLanguage: input.preferredLanguage, timezone: input.timezone, aiAssistance: input.aiAssistance ?? true, showTranslations: input.showTranslations ?? true, learningPreferences: input.learningPreferences },
  });
}
