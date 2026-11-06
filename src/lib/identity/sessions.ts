import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/types";
import { hasPermission } from "./permissions";

export async function listSessions(actor: SessionUser, userId = actor.id) {
  if (userId !== actor.id && !(await hasPermission(actor, "sessions.view"))) throw new ApiError(403, "You do not have permission to view these sessions.");
  return prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastActivityAt: true, impersonatorId: true },
    orderBy: { lastActivityAt: "desc" },
  });
}

export async function revokeSession(actor: SessionUser, sessionId: string, ownSessionId?: string | null) {
  const row = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!row || row.revokedAt) throw new ApiError(404, "Session not found.");
  const own = row.userId === actor.id;
  if (!own && !(await hasPermission(actor, "sessions.revoke"))) throw new ApiError(403, "You do not have permission to revoke this session.");
  await prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  await audit({ actorId: actor.impersonatorId ?? actor.id, action: "SESSION_REVOKED", entityType: "IDENTITY", entityId: row.userId, metadata: { sessionId, self: own } });
  return { ok: true, current: sessionId === ownSessionId };
}

export async function revokeOtherSessions(userId: string, keepId?: string | null) {
  await prisma.userSession.updateMany({ where: { userId, revokedAt: null, ...(keepId ? { id: { not: keepId } } : {}) }, data: { revokedAt: new Date() } });
}

export async function touchSession(id: string) {
  const row = await prisma.userSession.findUnique({ where: { id }, select: { lastActivityAt: true, revokedAt: true, expiresAt: true, userId: true } });
  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) return null;
  if (Date.now() - row.lastActivityAt.getTime() > 60_000) {
    await prisma.userSession.update({ where: { id }, data: { lastActivityAt: new Date() } });
  }
  return row;
}
