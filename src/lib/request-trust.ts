/**
 * Client IP resolution for security decisions.
 *
 * Phase 43 (F-01): `x-forwarded-for` is a request header that any client can
 * set. Treating its first entry as the client IP let an attacker rotate the
 * value and obtain a fresh login rate-limit bucket per request (twelve wrong
 * passwords, no throttle — reproduced against the running app in Phase 42).
 * The same value was also written into login and audit records, so an attacker
 * could choose which IP the security log blamed.
 *
 * Policy: forwarded headers are trusted only when the deployment explicitly
 * declares how many trusted proxy hops sit in front of the application, via
 * TRUSTED_PROXY_HOPS. With the default (0) no forwarded header is trusted and
 * `clientIp()` returns null. Callers then fall back to identifier-scoped
 * controls, which an attacker cannot rotate.
 *
 * Selecting the address: with N trusted hops the client address is the Nth
 * entry from the RIGHT of the chain, because each trusted proxy appends the
 * address it received the request from. Reading any position from the left
 * (as the pre-Phase-43 code did with index 0) trusts whatever the client sent.
 */
import { isIP } from "node:net";

/** Upper bound on configured hops; a value beyond this is treated as misconfiguration. */
const MAX_TRUSTED_HOPS = 10;

/**
 * Number of trusted reverse-proxy hops in front of the application.
 * Unset, empty, malformed, negative or absurd values all resolve to 0
 * (trust nothing), so a bad configuration fails closed rather than open.
 */
export function trustedProxyHops(raw: string | undefined = process.env.TRUSTED_PROXY_HOPS): number {
  const value = raw?.trim();
  if (!value || !/^\d{1,2}$/.test(value)) return 0;
  const hops = Number(value);
  return hops <= MAX_TRUSTED_HOPS ? hops : 0;
}

/**
 * The client IP address, or null when it cannot be established from a trusted
 * source. Never returns a value the caller could not have influenced unless a
 * trusted proxy is configured.
 */
export function clientIp(req: Request, hops: number = trustedProxyHops()): string | null {
  if (hops <= 0) return null;

  const header = req.headers.get("x-forwarded-for");
  if (!header) return null;

  const chain = header
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (chain.length < hops) return null;

  const candidate = chain[chain.length - hops];
  // Reject anything that is not a literal IP address (ports, hostnames,
  // "unknown", IPv4:port pairs inserted by some proxies, header injection).
  return isIP(candidate) === 0 ? null : candidate;
}

/**
 * Value suitable for a rate-limit key. Falls back to a constant when the IP is
 * unknown, collapsing untrusted requests onto identifier-scoped buckets.
 */
export function clientIpKey(req: Request, hops: number = trustedProxyHops()): string {
  return clientIp(req, hops) ?? "untrusted";
}
