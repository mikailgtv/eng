/**
 * Shared API plumbing: typed errors, a consistent success envelope,
 * route-handler wrapping, and authorization guards. Routes with custom auth
 * use safe explicit error handling without bypassing their auth boundary.
 */
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/api-errors";
import { sameOriginDecision } from "@/lib/app-origin";
export { ApiError, handleApiError } from "@/lib/api-errors";
import type { Role } from "@/lib/constants";
import type { SessionUser } from "@/types";

export const requestActor = new AsyncLocalStorage<{ impersonatorId?: string | null; requestId?: string }>();

/** Success envelope: { data }. */
export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Wrap a route handler with centralized error handling.
 * The handler may throw ApiError / ZodError / PrismaError freely.
 */
type AwaitableRouteContext<Ctx> = Ctx extends { params: infer Params }
  ? Omit<Ctx, "params"> & { params: Promise<Params> }
  : Ctx;

export function apiRoute<Ctx>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, rawCtx: AwaitableRouteContext<Ctx>): Promise<Response> => {
    const ctx = rawCtx && typeof rawCtx === "object" && "params" in rawCtx
      ? { ...rawCtx, params: await (rawCtx as { params: unknown }).params } as Ctx
      : rawCtx as Ctx;
    const suppliedRequestId = req.headers.get("x-request-id")?.trim();
    const requestId = suppliedRequestId && /^[A-Za-z0-9._-]{1,80}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
    try {
      const { getSessionUser } = await import("@/lib/auth");
      const user = await getSessionUser();
      const response = await requestActor.run({ impersonatorId: user?.impersonatorId, requestId }, () => handler(req, ctx));
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err) {
      return handleApiError(err, requestId);
    }
  };
}

/** Require an authenticated (and optionally role-matched) API caller. */
export async function requireApiUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "You need to sign in to continue.");
  if (roles && !roles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  return user;
}

/**
 * CSRF defence for mutations: browsers always attach an Origin header on
 * cross-site POST/PUT/PATCH/DELETE, so a mismatched origin is rejected.
 * Non-browser clients (no Origin) are authenticated by their session cookie.
 *
 * Phase 43 (F-02): the expected origin is the configured PUBLIC_APP_URL in
 * production and the Host header in development. `x-forwarded-host` is NOT
 * consulted — it is caller-controlled, and echoing it back used to satisfy the
 * check for any Origin. See `@/lib/app-origin`.
 */
export function assertSameOrigin(req: Request) {
  const decision = sameOriginDecision({
    originHeader: req.headers.get("origin"),
    hostHeader: req.headers.get("host"),
  });
  if (!decision.allowed) throw new ApiError(decision.status, decision.message);
}

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}
