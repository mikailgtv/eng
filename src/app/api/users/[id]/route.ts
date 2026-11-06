import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { updateUserSchema } from "@/lib/validations";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { audit, clientIp } from "@/lib/audit";
import { toSafeUser } from "@/lib/serializers";

const BCRYPT_ROUNDS = 12;

interface Ctx {
  params: { id: string };
}

export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const { requireApiUser } = await import("@/lib/api");
  const { userDetail } = await import("@/lib/identity/service");
  const actor = await requireApiUser();
  return jsonOk(await userDetail(actor, ctx.params.id));
});

/**
 * PATCH /api/users/[id] — update a user (ADMIN only).
 * Business rules enforced server-side:
 *  - an admin cannot deactivate their own account
 *  - the last active ADMIN cannot be demoted or deactivated
 *  - group / level targets are validated
 * Password changes invalidate the user's existing sessions (password version).
 * Emits granular audit entries (updated / activated / deactivated / role changed).
 */
export const PATCH = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requireApiUser(["ADMIN"]);
  const { requirePermission } = await import("@/lib/identity/permissions");
  await requirePermission(actor, "users.edit");
  const { id } = ctx.params;

  const input = updateUserSchema.parse(await parseJsonBody(req));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "User not found.");

  // ---- Business rules ------------------------------------------------------
  if (input.status && input.status !== "ACTIVE" && target.id === actor.id) {
    throw new ApiError(400, "You cannot deactivate your own account.", { status: ["Choose another administrator to perform this."] });
  }

  const losesAdmin =
    target.role === "ADMIN" && ((input.role && input.role !== "ADMIN") || (input.status && input.status !== "ACTIVE"));
  if (losesAdmin) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: target.id } },
    });
    if (otherActiveAdmins === 0) {
      throw new ApiError(400, "At least one active administrator must remain.");
    }
  }

  if (input.groupId) {
    const group = await prisma.learningGroup.findUnique({ where: { id: input.groupId }, select: { id: true } });
    if (!group) throw new ApiError(422, "The selected learning group does not exist.", { groupId: ["Choose a valid group."] });
  }

  // ---- Apply changes -------------------------------------------------------
  if (input.password) {
    const { assertPasswordAllowed, rememberPassword } = await import("@/lib/identity/security");
    await assertPasswordAllowed(id, input.password);
  }
  const passwordHash = input.password ? await bcrypt.hash(input.password, BCRYPT_ROUNDS) : undefined;
  if (passwordHash) {
    const { rememberPassword } = await import("@/lib/identity/security");
    await rememberPassword(id, passwordHash);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      employeeCode: input.employeeCode,
      username: input.username,
      email: input.email === undefined ? undefined : input.email ?? null,
      role: input.role,
      status: input.status,
      englishLevel: input.englishLevel === undefined ? undefined : input.englishLevel,
      groupId: input.groupId === undefined ? undefined : input.groupId === "" ? null : input.groupId,
      passwordHash,
    },
  });

  // ---- Audit (granular, non-sensitive) --------------------------------------
  const ip = clientIp(req);
  const roleChanged = input.role && input.role !== target.role;
  const deactivated = input.status && input.status !== target.status && input.status === "INACTIVE";
  const activated = input.status && input.status !== target.status && input.status === "ACTIVE";

  const otherChanges =
    Object.entries({
      firstName: input.firstName !== undefined && input.firstName !== target.firstName,
      lastName: input.lastName !== undefined && input.lastName !== target.lastName,
      employeeCode: input.employeeCode !== undefined && input.employeeCode !== target.employeeCode,
      username: input.username !== undefined && input.username !== target.username,
      email: input.email !== undefined && input.email !== target.email,
      groupId: input.groupId !== undefined && (input.groupId || null) !== target.groupId,
      englishLevel: input.englishLevel !== undefined && input.englishLevel !== target.englishLevel,
      password: Boolean(passwordHash),
    }).filter(([, changed]) => changed).length > 0;

  if (roleChanged) {
    await audit({
      actorId: actor.id, action: AUDIT_ACTIONS.ROLE_CHANGED, entityType: "USER", entityId: id,
      metadata: { username: target.username, from: target.role, to: input.role }, ipAddress: ip,
    });
  }
  if (deactivated) {
    await audit({
      actorId: actor.id, action: AUDIT_ACTIONS.USER_DEACTIVATED, entityType: "USER", entityId: id,
      metadata: { username: target.username }, ipAddress: ip,
    });
  }
  if (activated) {
    await audit({
      actorId: actor.id, action: AUDIT_ACTIONS.USER_ACTIVATED, entityType: "USER", entityId: id,
      metadata: { username: target.username }, ipAddress: ip,
    });
  }
  if (otherChanges) {
    await audit({
      actorId: actor.id, action: AUDIT_ACTIONS.USER_UPDATED, entityType: "USER", entityId: id,
      metadata: { username: target.username }, ipAddress: ip,
    });
  }

  return jsonOk({ user: toSafeUser(updated) });
});
