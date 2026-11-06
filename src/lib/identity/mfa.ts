import { randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { notifyUsers } from "@/lib/teaching/notify";
import { base32Encode, decryptSecret, encryptSecret, randomToken, sha256 } from "./crypto";
import { recordSecurityEvent } from "./security";
import { totpCode, verifyTotp } from "./totp";
import { assertMfaAllowed, recordMfaFailure, clearMfaFailures, MfaRateLimitError } from "@/lib/rate-limit";

export { totpCode, verifyTotp };

function sameHash(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function beginTotp(userId: string, username: string) {
  const secret = base32Encode(randomBytes(20));
  await prisma.mfaMethod.upsert({
    where: { userId_type: { userId, type: "TOTP" } },
    update: { secretEnc: encryptSecret(secret), enabled: false, confirmedAt: null },
    create: { userId, type: "TOTP", secretEnc: encryptSecret(secret), enabled: false },
  });
  const uri = `otpauth://totp/EnglishBridge:${encodeURIComponent(username)}?secret=${secret}&issuer=EnglishBridge&digits=6&period=30`;
  return { secret, uri };
}

export async function confirmTotp(userId: string, code: string) {
  const method = await prisma.mfaMethod.findUnique({ where: { userId_type: { userId, type: "TOTP" } } });
  if (!method?.secretEnc) throw new ApiError(422, "Set up an authenticator app first.");
  const secret = decryptSecret(method.secretEnc);
  if (!verifyTotp(secret, code)) {
    await recordSecurityEvent("MFA_FAILURE", { userId, metadata: { method: "TOTP" } });
    throw new ApiError(401, "That code is not valid.");
  }
  await prisma.mfaMethod.update({ where: { id: method.id }, data: { enabled: true, confirmedAt: new Date() } });
  const codes = Array.from({ length: 8 }, () => randomToken(6).slice(0, 10));
  await prisma.mfaBackupCode.deleteMany({ where: { userId } });
  await prisma.mfaBackupCode.createMany({ data: codes.map((code) => ({ userId, codeHash: sha256(code) })) });
  await recordSecurityEvent("MFA_ENABLED", { userId, metadata: { method: "TOTP" } });
  return { backupCodes: codes };
}

export async function beginEmailOtp(userId: string) {
  const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.mfaChallenge.create({ data: { userId, purpose: "EMAIL_LOGIN", codeHash: sha256(code), expiresAt } });
  await notifyUsers([userId], {
    type: "SECURITY",
    category: "SECURITY",
    priority: "HIGH",
    title: "Sign-in code",
    body: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not try to sign in, contact an administrator.`,
    href: "/student/security",
    source: "identity",
  });
  await prisma.mfaMethod.upsert({
    where: { userId_type: { userId, type: "EMAIL_OTP" } },
    update: { enabled: true, confirmedAt: new Date() },
    create: { userId, type: "EMAIL_OTP", enabled: true, confirmedAt: new Date() },
  });
  return { delivered: "notification" as const, expiresAt };
}

export async function verifyMfaCode(userId: string, code: string) {
  const clean = code.trim();
  // Rate limiting per user to prevent brute-force
  try {
    assertMfaAllowed(userId);
  } catch (err) {
    if (err instanceof MfaRateLimitError) {
      await recordSecurityEvent("MFA_RATE_LIMITED", { userId, metadata: { retryAfter: err.retryAfterSeconds } });
      throw new ApiError(429, `Too many failed attempts. Try again in ${err.retryAfterSeconds} seconds.`);
    }
    throw err;
  }

  const totp = await prisma.mfaMethod.findUnique({ where: { userId_type: { userId, type: "TOTP" } } });
  if (totp?.enabled && totp.secretEnc && verifyTotp(decryptSecret(totp.secretEnc), clean)) {
    clearMfaFailures(userId);
    return "TOTP";
  }
  const hash = sha256(clean);
  const backups = await prisma.mfaBackupCode.findMany({ where: { userId, usedAt: null } });
  const match = backups.find((row) => sameHash(row.codeHash, hash));
  if (match) {
    await prisma.mfaBackupCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
    clearMfaFailures(userId);
    return "BACKUP";
  }
  const challenge = await prisma.mfaChallenge.findFirst({ where: { userId, purpose: "EMAIL_LOGIN", usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (challenge && sameHash(challenge.codeHash, hash)) {
    await prisma.mfaChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
    clearMfaFailures(userId);
    return "EMAIL_OTP";
  }
  recordMfaFailure(userId);
  await recordSecurityEvent("MFA_FAILURE", { userId });
  throw new ApiError(401, "That code is not valid.");
}

export async function disableMfa(userId: string, type: "TOTP" | "EMAIL_OTP") {
  await prisma.mfaMethod.updateMany({ where: { userId, type }, data: { enabled: false, confirmedAt: null, secretEnc: null } });
  if (type === "TOTP") await prisma.mfaBackupCode.deleteMany({ where: { userId } });
  await recordSecurityEvent("MFA_DISABLED", { userId, metadata: { method: type } });
}

export async function mfaRequiredForLogin(userId: string) {
  const settings = await prisma.organizationSetting.findFirst({ select: { mfaMode: true } });
  const methods = await prisma.mfaMethod.count({ where: { userId, enabled: true, confirmedAt: { not: null } } });
  if (settings?.mfaMode === "REQUIRED" && methods === 0) return "setup";
  if (methods > 0 && settings?.mfaMode !== "OFF") return "verify";
  return null;
}
