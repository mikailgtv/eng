import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createUserSchema } from "@/lib/validations";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { audit, clientIp } from "@/lib/audit";
import { toSafeUser } from "@/lib/serializers";
import { assertPasswordAllowed, rememberPassword } from "@/lib/identity/security";
import { ensureIdentity, requirePermission } from "@/lib/identity/permissions";
import { searchUsers } from "@/lib/identity/service";

const BCRYPT_ROUNDS = 12;

/**
 * POST /api/users — create a user (ADMIN only).
 * Hashes the password, validates uniqueness (friendly 409s), writes an audit
 * entry. Passwords are never logged or echoed.
 */
export const GET = apiRoute(async (req) => {
  const actor = await requireApiUser();
  const url = new URL(req.url);
  return jsonOk(await searchUsers(actor, {
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    groupId: url.searchParams.get("groupId") ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
  }));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser(["ADMIN"]);
  await requirePermission(actor, "users.create");

  const input = createUserSchema.parse(await parseJsonBody(req));
  await assertPasswordAllowed(null, input.password);

  // Validate group assignment target.
  if (input.groupId) {
    const group = await prisma.learningGroup.findUnique({ where: { id: input.groupId }, select: { id: true, organizationId: true } });
    if (!group) throw new ApiError(422, "The selected learning group does not exist.", { groupId: ["Choose a valid group."] });
    const { actorOrgId: resolveOrg } = await import("@/lib/identity/tenant");
    const ownOrg = await resolveOrg(actor);
    if (group.organizationId && ownOrg && group.organizationId !== ownOrg) {
      throw new ApiError(422, "The selected learning group does not exist.", { groupId: ["Choose a valid group."] });
    }
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  // Phase 32: the new account joins the ACTOR's tenant. Previously this used
  // ensureIdentity() (the first organization in the database), so an
  // administrator of tenant B created accounts inside tenant A.
  const { actorOrgId } = await import("@/lib/identity/tenant");
  const actorOrg = (await actorOrgId(actor)) ?? (await ensureIdentity())?.id ?? null;

  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      employeeCode: input.employeeCode,
      username: input.username,
      email: input.email ?? null,
      role: input.role,
      status: input.status,
      englishLevel: input.englishLevel ?? null,
      groupId: input.groupId ?? null,
      organizationId: actorOrg,
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });
  await rememberPassword(user.id, passwordHash);

  await audit({
    actorId: actor.id,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: "USER",
    entityId: user.id,
    metadata: { username: user.username, role: user.role, groupId: user.groupId },
    ipAddress: clientIp(req),
  });

  return jsonOk({ user: toSafeUser(user) }, 201);
});
