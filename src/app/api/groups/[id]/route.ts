import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { updateGroupSchema } from "@/lib/validations";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { audit, clientIp } from "@/lib/audit";
import { syncLeadTeacher } from "@/lib/teaching/service";

interface Ctx {
  params: { id: string };
}

/** PATCH /api/groups/[id] — edit a group (ADMIN only) with granular auditing. */
export const PATCH = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requireApiUser(["ADMIN"]);
  const { requirePermission } = await import("@/lib/identity/permissions");
  await requirePermission(actor, "groups.manage");
  const { id } = ctx.params;

  const input = updateGroupSchema.parse(await parseJsonBody(req));

  const group = await prisma.learningGroup.findUnique({ where: { id } });
  if (!group) throw new ApiError(404, "Group not found.");

  // Phase 32: a class belongs to exactly one tenant. An administrator of
  // tenant A must not be able to rename, reassign or deactivate tenant B's
  // classes by guessing the id.
  const { assertTenant } = await import("@/lib/identity/tenant");
  await assertTenant(actor, group.organizationId, "groups.patch");

  // A teacher proposed as lead must belong to the same tenant as the class.
  if (input.teacherId) {
    const candidate = await prisma.user.findUnique({ where: { id: input.teacherId }, select: { organizationId: true } });
    if (candidate && candidate.organizationId && group.organizationId && candidate.organizationId !== group.organizationId) {
      throw new ApiError(422, "The selected teacher does not belong to this organization.", { teacherId: ["Choose a valid teacher."] });
    }
  }

  if (input.teacherId) {
    const teacher = await prisma.user.findFirst({
      where: { id: input.teacherId, role: "TEACHER" },
      select: { id: true },
    });
    if (!teacher) {
      throw new ApiError(422, "The selected teacher does not exist.", { teacherId: ["Choose a valid teacher."] });
    }
  }

  const updated = await prisma.learningGroup.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      description: input.description === undefined ? undefined : input.description ?? null,
      teacherId: input.teacherId === undefined ? undefined : input.teacherId || null,
      status: input.status,
    },
  });

  const ip = clientIp(req);
  const activated = input.status && input.status !== group.status && input.status === "ACTIVE";
  const deactivated = input.status && input.status !== group.status && input.status === "INACTIVE";
  const otherChanges =
    (input.name !== undefined && input.name !== group.name) ||
    (input.type !== undefined && input.type !== group.type) ||
    (input.description !== undefined && (input.description ?? null) !== group.description) ||
    (input.teacherId !== undefined && (input.teacherId || null) !== group.teacherId);

  if (activated) {
    await audit({ actorId: actor.id, action: AUDIT_ACTIONS.GROUP_ACTIVATED, entityType: "GROUP", entityId: id, metadata: { name: group.name }, ipAddress: ip });
  } else if (deactivated) {
    await audit({ actorId: actor.id, action: AUDIT_ACTIONS.GROUP_DEACTIVATED, entityType: "GROUP", entityId: id, metadata: { name: group.name }, ipAddress: ip });
  }
  if (otherChanges || (input.status && !activated && !deactivated)) {
    await audit({ actorId: actor.id, action: AUDIT_ACTIONS.GROUP_UPDATED, entityType: "GROUP", entityId: id, metadata: { name: group.name }, ipAddress: ip });
  }
  if (input.teacherId !== undefined && (input.teacherId || null) !== group.teacherId) {
    await syncLeadTeacher({ id: actor.id, role: actor.role }, id, group.teacherId, input.teacherId || null);
  }

  return jsonOk({ group: updated });
});
