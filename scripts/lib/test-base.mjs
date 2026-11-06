/**
 * Phase 36 (PG-35-06) — single base-URL convention for live HTTP test harnesses.
 *
 * BACKGROUND
 * ----------
 * Phase 35 recorded that the two live harnesses read different variables:
 *   - scripts/test-idor-live.mjs      → E2E_BASE (defaulted to :4032)
 *   - scripts/db/pg-backup-drill.mjs  → BASE     (defaulted to :4035)
 * A wrong-but-plausible value silently sent the suite at a default port and
 * produced ECONNREFUSED, which is easily mistaken for an application failure.
 *
 * CONVENTION (documented in the runbook)
 * --------------------------------------
 *   E2E_BASE   preferred, used by the newer Phase 35+ tooling
 *   BASE       accepted for compatibility with existing automation
 *   If both are set, E2E_BASE wins and the conflict is reported.
 *
 * SAFETY
 * ------
 *   - absent  → exit 2 with a clear message (never silently use a default host)
 *   - non-loopback target → refused unless E2E_ALLOW_REMOTE=yes
 *   - production-looking target → refused unless E2E_ALLOW_REMOTE=yes
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
const PRODUCTION_HINTS = /(^|[.\-])(prod|production|live)([.\-]|$)/i;

export function resolveTestBase(env = process.env) {
  const e2e = (env.E2E_BASE || "").trim();
  const legacy = (env.BASE || "").trim();

  if (e2e && legacy && e2e !== legacy) {
    console.warn(
      `[test-base] WARNING: E2E_BASE and BASE are both set and differ. Using E2E_BASE (documented precedence).`,
    );
  }
  const raw = e2e || legacy;

  if (!raw) {
    console.error(
      "[test-base] BLOCKED: no test target supplied.\n" +
        "  Set E2E_BASE (preferred) or BASE to the running application origin,\n" +
        "  e.g. E2E_BASE=http://127.0.0.1:4035 node scripts/test-idor-live.mjs\n" +
        "  This harness deliberately has no default host so it cannot test an unintended server.",
    );
    process.exit(2);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    console.error("[test-base] BLOCKED: the supplied test target is not a valid URL.");
    process.exit(2);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    console.error("[test-base] BLOCKED: the test target must be an http(s) origin.");
    process.exit(2);
  }

  const allowRemote = (env.E2E_ALLOW_REMOTE || "") === "yes";
  const host = url.hostname.toLowerCase();
  const isLoopback = LOOPBACK.has(host);

  if (!isLoopback && !allowRemote) {
    console.error(
      `[test-base] BLOCKED: refusing to run destructive-capable tests against a non-loopback target (${host}).\n` +
        "  Set E2E_ALLOW_REMOTE=yes only for an explicitly authorized staging environment.",
    );
    process.exit(2);
  }
  if (PRODUCTION_HINTS.test(host) && !allowRemote) {
    console.error(
      `[test-base] BLOCKED: the target hostname looks production-like (${host}).\n` +
        "  This harness writes synthetic fixtures and must never touch production.",
    );
    process.exit(2);
  }

  const base = url.origin;
  const source = e2e ? "E2E_BASE" : "BASE";
  console.log(`[test-base] target=${base} (from ${source}${isLoopback ? ", loopback" : ", remote authorized"})`);
  return base;
}
