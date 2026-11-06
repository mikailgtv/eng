import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertPasswordAllowed, recordSecurityEvent, rememberPassword } from "@/lib/identity/security";
import { revokeOtherSessions } from "@/lib/identity/sessions";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/constants";

const ROUNDS = 12;

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  if (actor.impersonatorId) throw new ApiError(403, "Support access cannot change a password.");
  const body = await parseJsonBody(req) as { currentPassword?: string; nextPassword?: string };
  if (!body.currentPassword || !body.nextPassword) throw new ApiError(422, "Enter your current password and a new password.");
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) throw new ApiError(401, "The current password is not correct.");
  await assertPasswordAllowed(user.id, body.nextPassword);
  const passwordHash = await bcrypt.hash(body.nextPassword, ROUNDS);
  await rememberPassword(user.id, user.passwordHash);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false, sessionVersion: { increment: 1 } } });
  await revokeOtherSessions(user.id);
  const sessionId = await createSession({ id: user.id, role: user.role as Role, passwordHash });
  await recordSecurityEvent("PASSWORD_CHANGED", { userId: user.id });
  await audit({ actorId: user.id, action: "PASSWORD_CHANGED", entityType: "IDENTITY", entityId: user.id, metadata: { username: user.username } });
  return jsonOk({ ok: true, sessionId });
});
