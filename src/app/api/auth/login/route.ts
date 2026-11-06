import { logSafeError } from "@/lib/logging";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MFA_COOKIE, createSession, signMfaToken } from "@/lib/auth";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { loginSchema } from "@/lib/validations";
import { ROLE_HOME } from "@/lib/constants";
import type { Role } from "@/lib/constants";
import { toSafeUser } from "@/lib/serializers";
import {
  LoginRateLimitError,
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { assertNotLocked, loginBlockMessage, noteFailedLogin, recordLoginAttempt, recordSecurityEvent } from "@/lib/identity/security";
import { ensureUserAccess } from "@/lib/identity/permissions";
import { mfaRequiredForLogin } from "@/lib/identity/mfa";
import { clientIp } from "@/lib/request-trust";

/**
 * POST /api/auth/login
 * Body: { identifier, password } — identifier accepts username or email.
 * Rate limited per IP+identifier; generic error messages avoid account
 * enumeration; deactivated accounts are rejected.
 */
export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const body = loginSchema.parse(await parseJsonBody(req));
  // Phase 43 (F-01): the client IP is taken only from a trusted proxy hop; with
  // no proxy configured this is null and the rate-limit key collapses to the
  // identifier, which a caller cannot rotate by supplying a header.
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent");
  const key = `${ip ?? "untrusted"}:${body.identifier.trim().toLowerCase()}`;
  try {
    assertLoginAllowed(key);
  } catch (err) {
    if (err instanceof LoginRateLimitError) throw new ApiError(429, err.message);
    throw err;
  }

  const identifier = body.identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  // Phase 43 (F-03): the lock must be enforced BEFORE the password comparison.
  // Previously it was checked after a correct password, which meant a locked
  // account still answered unlimited wrong-password attempts (12 attempts were
  // observed against one locked account in Phase 42) — the lock only blocked
  // the legitimate owner.
  if (user) {
    try {
      await assertNotLocked(user);
    } catch (err) {
      await recordLoginAttempt({ identifier, userId: user.id, success: false, ip, userAgent, reason: "locked" });
      throw err;
    }
  }

  const passwordOk = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    recordLoginFailure(key);
    if (user) await noteFailedLogin(user.id);
    await recordLoginAttempt({ identifier, userId: user?.id, success: false, ip, userAgent, reason: "invalid" });
    await recordSecurityEvent("LOGIN_FAILED", { userId: user?.id, ip });
    throw new ApiError(401, "Incorrect username or password.");
  }
  if (user.status !== "ACTIVE") {
    await recordLoginAttempt({ identifier, userId: user.id, success: false, ip, userAgent, reason: user.status });
    throw new ApiError(403, loginBlockMessage(user.status));
  }

  clearLoginFailures(key);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
  await recordLoginAttempt({ identifier, userId: user.id, success: true, ip, userAgent });
  await recordSecurityEvent("LOGIN_SUCCESS", { userId: user.id, ip });
  await ensureUserAccess(user.id).catch((err) => logSafeError("identity.access-seed-skipped", err));

  const mfa = await mfaRequiredForLogin(user.id).catch(() => null);
  if (mfa) {
    const token = await signMfaToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(MFA_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 300, path: "/" });
    return jsonOk({ mfaRequired: mfa, redirect: null });
  }

  await createSession({ id: user.id, role: user.role as Role, passwordHash: user.passwordHash }, { ip, userAgent });
  return jsonOk({
    user: toSafeUser(user),
    redirect: ROLE_HOME[user.role as Role] ?? "/dashboard",
  });
});
