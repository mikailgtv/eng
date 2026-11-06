import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { randomToken, sha256 } from "@/lib/identity/crypto";
import { assertIdentityRate, assertPasswordAllowed, recordSecurityEvent, rememberPassword } from "@/lib/identity/security";
import { audit } from "@/lib/audit";
import { notifyUsers } from "@/lib/teaching/notify";
import { clientIpKey } from "@/lib/request-trust";

const ROUNDS = 12;

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  assertIdentityRate(`reset:${clientIpKey(req)}`, 8);
  const body = await parseJsonBody(req) as { action?: string; userId?: string; token?: string; password?: string };
  if (body.action === "confirm" && body.token && body.password) {
    const row = await prisma.mfaChallenge.findFirst({ where: { purpose: "PASSWORD_RESET", codeHash: sha256(body.token), usedAt: null, expiresAt: { gt: new Date() } } });
    if (!row) throw new ApiError(400, "This reset link is invalid or expired.");
    await assertPasswordAllowed(row.userId, body.password);
    const passwordHash = await bcrypt.hash(body.password, ROUNDS);
    await rememberPassword(row.userId, passwordHash);
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false, sessionVersion: { increment: 1 }, lockedUntil: null, failedLoginCount: 0 } }),
      prisma.mfaChallenge.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      prisma.userSession.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await recordSecurityEvent("PASSWORD_RESET", { userId: row.userId });
    await audit({ actorId: row.userId, action: "PASSWORD_RESET", entityType: "IDENTITY", entityId: row.userId });
    return jsonOk({ ok: true });
  }
  const actor = await requireApiUser();
  if (!body.userId) throw new ApiError(422, "Choose a user.");
  const { requirePermission } = await import("@/lib/identity/permissions");
  await requirePermission(actor, "users.edit");
  const token = randomToken();
  await prisma.mfaChallenge.create({ data: { userId: body.userId, purpose: "PASSWORD_RESET", codeHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
  await prisma.user.update({ where: { id: body.userId }, data: { mustChangePassword: true } });
  await audit({ actorId: actor.id, action: "PASSWORD_RESET", entityType: "IDENTITY", entityId: body.userId, metadata: { issuedBy: actor.id } });
  await notifyUsers([body.userId], { type: "SECURITY", category: "SECURITY", title: "Password reset", body: "An administrator issued a password reset. Use the link they share with you. Email delivery is not configured.", href: "/login", source: "identity" });
  return jsonOk({ link: `/reset-password/${token}`, expiresInMinutes: 60 });
});
