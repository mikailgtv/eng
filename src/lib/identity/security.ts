import { logSafeError } from "@/lib/logging";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const writes = new Map<string, { count: number; resetAt: number }>();

export function assertIdentityRate(key: string, limit = 30) {
  const now = Date.now();
  const row = writes.get(key);
  if (!row || row.resetAt < now) {
    writes.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  row.count += 1;
  if (row.count > limit) throw new ApiError(429, "Too many attempts. Wait a minute and try again.");
}

export async function orgSettings() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, include: { settings: true } });
  if (!org?.settings) throw new ApiError(500, "Organization settings are not ready.");
  return { org, settings: org.settings };
}

export function passwordProblems(password: string, settings: {
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireLower: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
}) {
  const problems: string[] = [];
  if (password.length < settings.passwordMinLength) problems.push(`Use at least ${settings.passwordMinLength} characters.`);
  if (password.length > 72) problems.push("Use at most 72 characters.");
  if (settings.passwordRequireUpper && !/[A-Z]/.test(password)) problems.push("Include an uppercase letter.");
  if (settings.passwordRequireLower && !/[a-z]/.test(password)) problems.push("Include a lowercase letter.");
  if (settings.passwordRequireNumber && !/[0-9]/.test(password)) problems.push("Include a number.");
  if (settings.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) problems.push("Include a symbol.");
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) problems.push("Include a letter and a number.");
  return problems;
}

export async function assertPasswordAllowed(userId: string | null, password: string) {
  const org = await prisma.organization.findFirst({ include: { settings: true } });
  const settings = org?.settings ?? {
    passwordMinLength: 8,
    passwordRequireUpper: false,
    passwordRequireLower: false,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,
    passwordHistory: 0,
  };
  const problems = passwordProblems(password, settings);
  if (problems.length) throw new ApiError(422, problems[0], { password: problems });
  if (!userId || settings.passwordHistory <= 0) return;
  const history = await prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: settings.passwordHistory, select: { passwordHash: true } });
  for (const row of history) {
    if (await bcrypt.compare(password, row.passwordHash)) throw new ApiError(422, "Choose a password you have not used recently.", { password: ["That password was used recently."] });
  }
}

export async function rememberPassword(userId: string, passwordHash: string) {
  await prisma.passwordHistory.create({ data: { userId, passwordHash } });
  const { settings } = await orgSettings();
  const keep = Math.max(settings.passwordHistory, 5);
  const old = await prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: keep, select: { id: true } });
  if (old.length) await prisma.passwordHistory.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
}

export async function recordSecurityEvent(type: string, input: { userId?: string | null; ip?: string | null; metadata?: Record<string, unknown> }) {
  try {
    await prisma.accountSecurityEvent.create({
      data: { type, userId: input.userId ?? null, ipAddress: input.ip ?? null, metadata: input.metadata ? JSON.stringify(input.metadata) : null },
    });
  } catch (err) {
    logSafeError("security.event-write-failed", err);
  }
}

export async function recordLoginAttempt(input: { identifier: string; userId?: string | null; success: boolean; ip?: string | null; userAgent?: string | null; reason?: string }) {
  try {
    await prisma.loginAttempt.create({
      data: {
        identifier: input.identifier.slice(0, 120),
        userId: input.userId ?? null,
        success: input.success,
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 200) ?? null,
        reason: input.reason ?? null,
      },
    });
  } catch (err) {
    logSafeError("security.login-attempt-write-failed", err);
  }
}

/**
 * Lockout settings for the tenant the user belongs to.
 *
 * Phase 43 (F-06): this used to read `organization.findFirst()` with no filter —
 * whichever tenant happened to be first governed every user on the platform —
 * and returned early when that tenant had no settings row, which silently
 * disabled lockout entirely (a fail-open security control). Settings are now
 * scoped to the user's own organization, and the schema defaults from
 * `OrganizationSetting` apply when a row is missing.
 */
const DEFAULT_LOCKOUT_SETTINGS = { lockoutThreshold: 5, lockoutMinutes: 15, progressiveDelay: true };

async function lockoutSettingsFor(userId: string) {
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
  const settings = owner?.organizationId
    ? await prisma.organizationSetting.findUnique({ where: { organizationId: owner.organizationId } })
    : null;
  if (!settings) return DEFAULT_LOCKOUT_SETTINGS;
  return {
    lockoutThreshold: settings.lockoutThreshold,
    lockoutMinutes: settings.lockoutMinutes,
    progressiveDelay: settings.progressiveDelay,
  };
}

export async function noteFailedLogin(userId: string) {
  const settings = await lockoutSettingsFor(userId);
  const user = await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: { increment: 1 } }, select: { failedLoginCount: true } });
  if (settings.progressiveDelay && user.failedLoginCount > 1) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(user.failedLoginCount * 200, 1500)));
  }
  if (user.failedLoginCount >= settings.lockoutThreshold) {
    const lockedUntil = new Date(Date.now() + settings.lockoutMinutes * 60_000);
    await prisma.user.update({ where: { id: userId }, data: { lockedUntil } });
    await recordSecurityEvent("ACCOUNT_LOCK", { userId, metadata: { until: lockedUntil.toISOString() } });
    await audit({ actorId: userId, action: "ACCOUNT_LOCKED", entityType: "IDENTITY", entityId: userId, metadata: { until: lockedUntil.toISOString() } });
  }
}

export async function assertNotLocked(user: { id: string; lockedUntil: Date | null }) {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new ApiError(403, "This account is temporarily locked. Try again later or contact an administrator.");
  }
}

export function loginBlockMessage(status: string) {
  if (status === "ARCHIVED") return "This account is archived and cannot sign in.";
  if (status === "SUSPENDED") return "This account is suspended. Contact an administrator.";
  if (status === "INVITED" || status === "PENDING") return "This account is not active yet.";
  return "This account has been deactivated. Please contact your administrator.";
}
