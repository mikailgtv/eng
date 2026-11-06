import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MFA_COOKIE, createSession, verifyMfaToken } from "@/lib/auth";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { beginEmailOtp, beginTotp, confirmTotp, disableMfa, verifyMfaCode } from "@/lib/identity/mfa";
import { recordSecurityEvent } from "@/lib/identity/security";
import { ROLE_HOME, type Role } from "@/lib/constants";
import { clientIp } from "@/lib/request-trust";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  const methods = await prisma.mfaMethod.findMany({ where: { userId: actor.id }, select: { type: true, enabled: true, confirmedAt: true } });
  return jsonOk({ methods });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const body = await parseJsonBody(req) as { action?: string; code?: string; type?: "TOTP" | "EMAIL_OTP" };
  if (body.action === "verify") {
    const cookieStore = await cookies();
    const token = cookieStore.get(MFA_COOKIE)?.value;
    const userId = token ? await verifyMfaToken(token) : null;
    if (!userId || !body.code) throw new ApiError(401, "The sign-in check has expired. Sign in again.");
    await verifyMfaCode(userId, body.code);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") throw new ApiError(403, "This account cannot sign in.");
    cookieStore.set(MFA_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
    await createSession({ id: user.id, role: user.role as Role, passwordHash: user.passwordHash }, { ip: clientIp(req), userAgent: req.headers.get("user-agent") });
    await recordSecurityEvent("LOGIN_SUCCESS", { userId, metadata: { mfa: true } });
    return jsonOk({ redirect: ROLE_HOME[user.role as Role] ?? "/dashboard" });
  }
  const actor = await requireApiUser();
  if (actor.impersonatorId) throw new ApiError(403, "Support access cannot change sign-in security.");
  if (body.action === "totp") return jsonOk(await beginTotp(actor.id, actor.username));
  if (body.action === "confirm" && body.code) return jsonOk(await confirmTotp(actor.id, body.code));
  if (body.action === "email") return jsonOk(await beginEmailOtp(actor.id));
  if (body.action === "disable" && body.type) {
    await disableMfa(actor.id, body.type);
    return jsonOk({ ok: true });
  }
  throw new ApiError(422, "Choose a sign-in security action.");
});
