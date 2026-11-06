import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { groupSchema } from "@/lib/validations";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { audit, clientIp } from "@/lib/audit";

/**
 * POST /api/groups — create a learning group (ADMIN only).
 * Group types are validated against the open registry in lib/constants.ts.
 */
export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser(["ADMIN"]);
  const { requirePermission } = await import("@/lib/identity/permissions");
  await requirePermission(actor, "groups.manage");

  const input = groupSchema.parse(await parseJsonBody(req));

  if (input.teacherId) {
    const teacher = await prisma.user.findFirst({
      where: { id: input.teacherId, role: "TEACHER" },
      select: { id: true },
    });
    if (!teacher) {
      throw new ApiError(422, "The selected teacher does not exist.", { teacherId: ["Choose a valid teacher."] });
    }
  }

  const group = await prisma.learningGroup.create({
    data: {
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      teacherId: input.teacherId || null,
      status: input.status,
    },
  });

  await audit({
    actorId: actor.id,
    action: AUDIT_ACTIONS.GROUP_CREATED,
    entityType: "GROUP",
    entityId: group.id,
    metadata: { name: group.name, type: group.type },
    ipAddress: clientIp(req),
  });

  return jsonOk({ group }, 201);
});
