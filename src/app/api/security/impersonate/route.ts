import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requirePermission } from "@/lib/identity/permissions";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/constants";
import { clientIp } from "@/lib/request-trust";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { action?: string; userId?: string; reason?: string; minutes?: number };
  if (body.action === "end") {
    if (!actor.impersonatorId) throw new ApiError(400, "You are not in support access.");
    const admin = await prisma.user.findUnique({ where: { id: actor.impersonatorId } });
    if (!admin || admin.status !== "ACTIVE") throw new ApiError(403, "The administrator session is no longer valid.");
    await prisma.supportAccessSession.updateMany({ where: { actorId: admin.id, targetUserId: actor.id, endedAt: null }, data: { endedAt: new Date() } });
    await createSession({ id: admin.id, role: admin.role as Role, passwordHash: admin.passwordHash });
    await audit({ actorId: admin.id, action: "SUPPORT_ACCESS_ENDED", entityType: "IDENTITY", entityId: actor.id });
    return jsonOk({ redirect: "/admin/security" });
  }
  await requirePermission(actor, "users.impersonate");
  if (!body.userId || !body.reason || body.reason.trim().length < 8) throw new ApiError(422, "A reason of at least 8 characters is required.");
  if (body.userId === actor.id) throw new ApiError(400, "Choose another user.");
  const target = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!target || target.status !== "ACTIVE") throw new ApiError(404, "User not found.");
  const minutes = Math.min(Math.max(body.minutes ?? 15, 5), 30);
  const support = await prisma.supportAccessSession.create({
    data: { actorId: actor.id, targetUserId: target.id, reason: body.reason.trim(), expiresAt: new Date(Date.now() + minutes * 60_000) },
  });
  await createSession(
    { id: target.id, role: target.role as Role, passwordHash: target.passwordHash },
    { impersonatorId: actor.id, supportId: support.id, ip: clientIp(req), userAgent: req.headers.get("user-agent") },
  );
  await audit({ actorId: actor.id, action: "SUPPORT_ACCESS_STARTED", entityType: "IDENTITY", entityId: target.id, metadata: { reason: body.reason.trim(), minutes, supportId: support.id } });
  return jsonOk({ redirect: target.role === "STUDENT" ? "/student" : target.role === "TEACHER" ? "/teacher" : "/admin", expiresAt: support.expiresAt });
});
