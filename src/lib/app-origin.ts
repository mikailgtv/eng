/**
 * Canonical application origin — one definition of "this application's own
 * origin", shared by CSRF origin checks and certificate link generation.
 *
 * Phase 43 (F-02): the CSRF check previously compared the `Origin` header
 * against `x-forwarded-host`, a caller-controlled header. Any client that
 * echoed its own Origin into `x-forwarded-host` satisfied the check. Origin
 * decisions now use either the explicitly configured PUBLIC_APP_URL
 * (production) or the `Host` header (development), never `x-forwarded-host`.
 *
 * This module deliberately has no imports so it can be used from the API
 * plumbing (`@/lib/api`) without a cycle through `@/lib/api-errors`.
 */

/** Development fallback origin, used when PUBLIC_APP_URL is not configured. */
export const DEFAULT_DEV_ORIGIN = "http://127.0.0.1:3000";

/** Hostnames that are never acceptable as a production public origin. */
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

export type AppOriginResult = { ok: true; origin: string } | { ok: false; message: string };

/**
 * Resolve the configured public origin.
 *
 * - Not configured: development falls back to DEFAULT_DEV_ORIGIN; production
 *   fails closed (a production deployment must declare its public origin).
 * - Configured: must be a parseable http(s) URL, HTTPS in production, and not
 *   a loopback host in production.
 */
export function resolveAppOrigin(isProduction = process.env.NODE_ENV === "production"): AppOriginResult {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (!configured) {
    return isProduction
      ? { ok: false, message: "The public application URL is not configured." }
      : { ok: true, origin: DEFAULT_DEV_ORIGIN };
  }
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    return { ok: false, message: "The public application URL is invalid." };
  }
  if (!["http:", "https:"].includes(url.protocol) || (isProduction && url.protocol !== "https:")) {
    return { ok: false, message: "The public application URL must use HTTPS in production." };
  }
  if (isProduction && LOCAL_HOSTNAMES.includes(url.hostname)) {
    return { ok: false, message: "The public application URL must use the production domain." };
  }
  return { ok: true, origin: url.origin };
}

export const CROSS_ORIGIN_MESSAGE = "Request blocked: cross-origin requests are not allowed.";

export type OriginDecision =
  | { allowed: true }
  | { allowed: false; status: 400 | 403 | 503; message: string };

/**
 * Decide whether a mutating request may proceed.
 *
 * Requests with no `Origin` header are allowed: browsers always send `Origin`
 * on cross-site POST/PUT/PATCH/DELETE, so a missing Origin means a non-browser
 * client, which is authenticated by its session cookie instead. This is the
 * documented Phase 1 behaviour and is unchanged by Phase 43.
 *
 * Pure by design (explicit inputs, no global state) so the policy can be unit
 * tested without a running server.
 */
export function sameOriginDecision(input: {
  originHeader: string | null;
  hostHeader: string | null;
  isProduction?: boolean;
}): OriginDecision {
  const origin = input.originHeader;
  if (!origin) return { allowed: true };

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return { allowed: false, status: 400, message: "Invalid request origin." };
  }

  const isProduction = input.isProduction ?? process.env.NODE_ENV === "production";

  if (isProduction) {
    // Production: compare against the configured canonical origin only.
    const resolved = resolveAppOrigin(isProduction);
    if (!resolved.ok) return { allowed: false, status: 503, message: resolved.message };
    if (originUrl.origin !== resolved.origin) {
      return { allowed: false, status: 403, message: CROSS_ORIGIN_MESSAGE };
    }
    return { allowed: true };
  }

  // Development / test: compare against the Host header the browser addressed.
  const host = input.hostHeader;
  if (!host || originUrl.host !== host) {
    return { allowed: false, status: 403, message: CROSS_ORIGIN_MESSAGE };
  }
  return { allowed: true };
}
