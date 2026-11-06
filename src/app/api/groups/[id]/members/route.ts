import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assignMemberSchema, removeMemberSchema } from "@/lib/validations";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { audit, clientIp } from "@/lib/audit";

interface Ctx {
  params: { id: string };
}

async function getGroupOrThrow(id: string) {
  const group = await prisma.learningGroup.findUnique({ where: { id } });
  if (!group) throw new ApiError(404, "Group not found.");
  return group;
}

/**
 * POST /api/groups/[id]/members — assign a STUDENT to a group (ADMIN only).
 * A student belongs to at most one group: assigning them here moves them out
 * of any previous group (the client confirms that move explicitly).
 */
export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requireApiUser(["ADMIN"]);
  const { id } = ctx.params;

  const { userId } = assignMemberSchema.parse(await parseJsonBody(req));
  const group = await getGroupOrThrow(id);

  const student = await prisma.user.findFirst({
    where: { id: userId, role: "STUDENT" },
    include: { group: { select: { name: true } } },
  });
  if (!student) throw new ApiError(404, "Student not found. Only students can be assigned to groups.");
  if (student.groupId === group.id) throw new ApiError(400, "This student is already in this group.");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { groupId: group.id },
  });

  await audit({
    actorId: actor.id,
    action: AUDIT_ACTIONS.MEMBER_ASSIGNED,
    entityType: "GROUP",
    entityId: group.id,
    metadata: { studentUsername: student.username, previousGroup: student.group?.name ?? null },
    ipAddress: clientIp(req),
  });

  return jsonOk({ member: { id: updated.id, groupId: updated.groupId } });
});

/**
 * DELETE /api/groups/[id]/members — remove a student from a group (ADMIN only).
 * Membership is cleared (groupId = null); the user account is never deleted.
 */
export const DELETE = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requireApiUser(["ADMIN"]);
  const { id } = ctx.params;

  const { userId } = removeMemberSchema.parse(await parseJsonBody(req));
  const group = await getGroupOrThrow(id);

  const student = await prisma.user.findFirst({ where: { id: userId, groupId: group.id } });
  if (!student) throw new ApiError(404, "This student is not a member of the group.");

  await prisma.user.update({ where: { id: userId }, data: { groupId: null } });

  await audit({
    actorId: actor.id,
    action: AUDIT_ACTIONS.MEMBER_REMOVED,
    entityType: "GROUP",
    entityId: group.id,
    metadata: { studentUsername: student.username },
    ipAddress: clientIp(req),
  });

  return jsonOk({ ok: true });
});
