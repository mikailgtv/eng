/**
 * Centralized session authentication.
 *
 * Model: stateless signed JWT (HS256, `jose`) stored in an httpOnly cookie,
 * verified on the edge in middleware AND re-validated against the database on
 * every server request. The token only proves identity (`sub`) — role, group
 * and status are always read fresh from the DB, so deactivating a user or
 * changing their role takes effect immediately, even mid-session.
 *
 * The payload also carries a "password version" (`pv`, a short hash of the
 * current password hash): changing a user's password invalidates any session
 * issued before the change.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";
import type { SessionUser } from "@/types";

export const SESSION_COOKIE = "eb.session";
export const MFA_COOKIE = "eb.mfa";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short — set a 32+ char random string in .env");
  }
  return new TextEncoder().encode(secret);
}

/** Short fingerprint of the password hash used to invalidate stale sessions. */
export function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 12);
}

export type SessionPayload = { sub: string; role: string; pv: string; sid?: string; sv?: number; act?: string };

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, pv: payload.pv, sid: payload.sid, sv: payload.sv, act: payload.act })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionSecret());
}

export async function signMfaToken(userId: string) {
  return new SignJWT({ purpose: "mfa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(sessionSecret());
}

export async function verifyMfaToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.purpose !== "mfa" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub || typeof payload.role !== "string" || typeof payload.pv !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role,
      pv: payload.pv,
      sid: typeof payload.sid === "string" ? payload.sid : undefined,
      sv: typeof payload.sv === "number" ? payload.sv : undefined,
      act: typeof payload.act === "string" ? payload.act : undefined,
    };
  } catch {
    return null;
  }
}

/** Issue the session cookie after a successful login. Route handlers only. */
export async function createSession(
  user: { id: string; role: Role; passwordHash: string },
  meta?: { ip?: string | null; userAgent?: string | null; impersonatorId?: string | null; supportId?: string | null },
) {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } });
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent?.slice(0, 200) ?? null,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
      impersonatorId: meta?.impersonatorId ?? null,
      supportId: meta?.supportId ?? null,
    },
  });
  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    pv: passwordVersion(user.passwordHash),
    sid: session.id,
    sv: dbUser?.sessionVersion ?? 0,
    act: meta?.impersonatorId ?? undefined,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return session.id;
}

/** Destroy the current session cookie and revoke its server record. */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload?.sid) {
      await prisma.userSession.updateMany({ where: { id: payload.sid, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  }
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Resolve the current session user, fully re-validated against the database:
 * token must verify, user must exist, be ACTIVE, and the password must not
 * have changed since the token was issued. Memoized per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      employeeCode: true,
      role: true,
      status: true,
      englishLevel: true,
      groupId: true,
      organizationId: true,
      passwordHash: true,
      sessionVersion: true,
      group: { select: { id: true, name: true, type: true, status: true } },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;
  if (passwordVersion(user.passwordHash) !== payload.pv) return null;
  if (typeof payload.sv === "number" && payload.sv !== user.sessionVersion) return null;
  if (payload.sv === undefined && user.sessionVersion !== 0) return null;
  if (payload.sid) {
    const session = await prisma.userSession.findUnique({ where: { id: payload.sid }, select: { revokedAt: true, expiresAt: true, userId: true, lastActivityAt: true } });
    if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
    if (Date.now() - session.lastActivityAt.getTime() > 60_000) {
      await prisma.userSession.update({ where: { id: payload.sid }, data: { lastActivityAt: new Date() } });
    }
  }
  if (payload.act) {
    const support = await prisma.supportAccessSession.findFirst({
      where: { actorId: payload.act, targetUserId: user.id, endedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!support) return null;
  }

  const { passwordHash: _stripped, sessionVersion: _version, ...safe } = user;
  return { ...safe, impersonatorId: payload.act ?? null } as SessionUser;
});
