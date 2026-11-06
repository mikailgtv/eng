import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { resolveAppOrigin } from "@/lib/app-origin";
import { assertGroupAccess } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";

export async function visibleStudent(viewer: SessionUser, studentId: string) {
  if (viewer.role === "STUDENT") {
    if (viewer.id !== studentId) throw new ApiError(404, "Student not found.");
    const self = await prisma.user.findUnique({ where: { id: viewer.id } });
    if (!self) throw new ApiError(404, "Student not found.");
    return self;
  }
  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" } });
  if (!student) throw new ApiError(404, "Student not found.");
  if (viewer.role === "ADMIN") return student;
  if (!student.groupId) throw new ApiError(404, "Student not found.");
  await assertGroupAccess(viewer, student.groupId);
  return student;
}

export function assertConfirmed(confirm: unknown, reason?: unknown, reasonRequired = false) {
  if (confirm !== true) throw new ApiError(400, "Confirm this official action before continuing.");
  if (reasonRequired && (typeof reason !== "string" || reason.trim().length < 3)) {
    throw new ApiError(400, "Enter a reason of at least 3 characters.");
  }
}

export function configuredAppOrigin(): string {
  // Shared definition of the canonical origin (see `@/lib/app-origin`).
  const resolved = resolveAppOrigin();
  if (!resolved.ok) throw new ApiError(503, resolved.message);
  return resolved.origin;
}

export function requestOrigin(req: Request): string {
  // Production certificate links use an explicitly configured trusted origin,
  // never the caller-controlled Host / forwarded headers.
  if (process.env.NODE_ENV === "production") return configuredAppOrigin();
  // Development: `x-forwarded-host` is deliberately ignored for the same reason
  // as in the CSRF check (Phase 43, F-02) — it is caller-controlled.
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return configuredAppOrigin();
}
