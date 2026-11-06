import { logSafeError } from "@/lib/logging";
import { clientIp as trustedClientIp } from "@/lib/request-trust";
/**
 * Audit trail for important administrative actions.
 *
 * - Fire-and-forget from the caller's perspective: auditing must never break
 *   the primary operation, but failures are logged server-side.
 * - NEVER log passwords, hashes, tokens or other secrets — callers only pass
 *   non-sensitive change metadata (see lib/serializers.ts helpers).
 */
import { prisma } from "@/lib/prisma";

export type AuditEntityType = "USER" | "GROUP" | "SYSTEM" | "QUESTION" | "ASSESSMENT" | "CLASS" | "ATTENDANCE" | "ASSIGNMENT" | "LESSON" | "NOTE" | "PLAN" | "AI" | "VOICE" | "ADAPTIVE" | "GAMIFICATION" | "CERTIFICATE" | "COMMUNICATION" | "CONTENT" | "IDENTITY" | "INTEGRATION";
import { requestActor } from "@/lib/api";

export type AuditInput = {
  actorId: string | null;
  action: string;
  /** Broadened in Phase 4, Phase 15, and Phase 18: integrations are audited too. */
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata || requestActor.getStore()?.impersonatorId
          ? JSON.stringify({ ...(input.metadata ?? {}), ...(requestActor.getStore()?.impersonatorId ? { impersonatorId: requestActor.getStore()?.impersonatorId } : {}) })
          : null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    logSafeError("audit.write-failed", err);
  }
}

/**
 * Client IP for audit records.
 *
 * Phase 43 (F-01): this used to return the first `x-forwarded-for` entry, i.e.
 * a value the caller chooses. Writing a caller-chosen address into the audit
 * trail lets an attacker decide which IP an investigation blames, so an
 * untrusted header is now never recorded. When no trusted proxy hop is
 * configured the honest answer is "unknown"; set TRUSTED_PROXY_HOPS in a
 * proxied deployment to restore attribution.
 */
export function clientIp(req: Request): string {
  return trustedClientIp(req) ?? "unknown";
}
