/**
 * Phase 36 — PostgreSQL TLS policy and URL translation.
 *
 * WHY THIS MODULE EXISTS (Phase 35 finding PG-35-01)
 * --------------------------------------------------
 * Prisma's query engine recognises only `sslmode=disable|prefer|require`. Any
 * other value — including libpq's `verify-full` — is silently downgraded to
 * `prefer`, which encrypts the connection but performs NO certificate or
 * hostname validation. Phase 35 proved this empirically: with `sslmode=verify-full`
 * and a CA that never signed the server certificate, Prisma Client and the
 * Prisma CLI both connected successfully.
 *
 * The only parameter that authenticates the server is `sslaccept=strict`
 * together with `sslcert=<path to CA>`.
 *
 * This module is deliberately free of `server-only`, database clients and
 * side effects so that it can be unit-tested and reused by:
 *   - startup environment validation (src/lib/server-env.ts)
 *   - readiness reporting (src/lib/system-health.ts)
 *   - the backup/restore tooling URL (src/lib/backup/database.ts)
 *
 * It NEVER returns or logs a connection URL containing a password.
 */

export type TlsProblem =
  | "strict_mode_required"   // sslaccept is missing or not "strict"
  | "ca_required"            // sslcert (CA path) is missing
  | "sslmode_insecure"       // sslmode would allow plaintext or no verification
  | "not_postgresql";        // URL is not a postgres URL

export type TlsAudit = {
  isPostgres: boolean;
  problems: TlsProblem[];
};

/** sslmode values that cannot silently fall back to an unencrypted connection. */
const NON_DOWNGRADING_SSLMODES = new Set(["require", "verify-ca", "verify-full"]);

function safeParse(rawUrl: string | undefined): URL | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

export function isPostgresUrl(rawUrl: string | undefined): boolean {
  const url = safeParse(rawUrl);
  return Boolean(url && ["postgres:", "postgresql:"].includes(url.protocol));
}

/**
 * Audit whether a PostgreSQL URL enables authenticated TLS.
 *
 * A URL passes only when it uses `sslaccept=strict`, supplies a CA via
 * `sslcert`, and uses an sslmode that cannot downgrade to plaintext.
 */
export function auditPostgresTls(rawUrl: string | undefined): TlsAudit {
  const url = safeParse(rawUrl);
  if (!url || !["postgres:", "postgresql:"].includes(url.protocol)) {
    return { isPostgres: false, problems: [] };
  }

  const problems: TlsProblem[] = [];
  const sslaccept = url.searchParams.get("sslaccept");
  const sslcert = (url.searchParams.get("sslcert") || "").trim();
  const sslmode = (url.searchParams.get("sslmode") || "").toLowerCase();

  if (sslaccept !== "strict") problems.push("strict_mode_required");
  if (!sslcert) problems.push("ca_required");
  // Empty sslmode is libpq's default ("prefer") and can downgrade to plaintext.
  if (!sslmode || !NON_DOWNGRADING_SSLMODES.has(sslmode)) problems.push("sslmode_insecure");

  return { isPostgres: true, problems };
}

/** Human-readable, secret-free explanation for a problem code. */
export function describeTlsProblem(problem: TlsProblem): string {
  switch (problem) {
    case "strict_mode_required":
      return "DATABASE_URL must set sslaccept=strict (Prisma ignores sslmode for certificate verification)";
    case "ca_required":
      return "DATABASE_URL must set sslcert=<path to the server CA certificate>";
    case "sslmode_insecure":
      return "DATABASE_URL sslmode must be require, verify-ca or verify-full";
    case "not_postgresql":
      return "DATABASE_URL must be a postgresql:// URL";
  }
}

/**
 * Build a libpq-compatible connection string for pg_dump / pg_restore / psql
 * from the Prisma connection string (Phase 35 finding PG-35-03).
 *
 * `pg_dump --dbname <prisma-url>` fails with
 *   invalid URI query parameter: "sslaccept"
 * because those parameters are Prisma-only.
 *
 * Translation rules:
 *   - `sslaccept` is dropped (Prisma-only)
 *   - `sslcert` is dropped and re-expressed as libpq's `sslrootcert`
 *     (libpq's own `sslcert` means *client* certificate — reusing it would
 *     misconfigure the tool)
 *   - when strict verification was requested, `sslmode` becomes `verify-full`,
 *     which libpq honours for certificate AND hostname checks
 *   - an insecure/unset sslmode is REFUSED rather than silently upgraded, so a
 *     caller can never believe it is verifying when it is not
 *
 * Throws an Error whose message contains no URL, host, user or password.
 */
export function toLibpqConnectionUrl(rawUrl: string | undefined): string {
  const url = safeParse(rawUrl);
  if (!url || !["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Backup connection configuration error: database URL is not a PostgreSQL URL");
  }

  const sslaccept = url.searchParams.get("sslaccept");
  const sslcert = (url.searchParams.get("sslcert") || "").trim();
  const sslmode = (url.searchParams.get("sslmode") || "").toLowerCase();

  const out = new URL(url.toString());
  out.searchParams.delete("sslaccept");
  out.searchParams.delete("schema"); // Prisma-only; psql rejects it
  out.searchParams.delete("sslcert"); // libpq would treat this as a CLIENT cert

  if (sslaccept === "strict") {
    if (!sslcert) {
      throw new Error("Backup connection configuration error: strict TLS requires sslcert to be set");
    }
    out.searchParams.set("sslmode", "verify-full");
    out.searchParams.set("sslrootcert", sslcert);
    return out.toString();
  }

  // Not strict: only accept a configuration that libpq will verify on its own.
  if (sslmode === "verify-full" || sslmode === "verify-ca") {
    const root = url.searchParams.get("sslrootcert");
    if (!root) {
      throw new Error("Backup connection configuration error: verify modes require sslrootcert");
    }
    out.searchParams.set("sslmode", sslmode);
    out.searchParams.set("sslrootcert", root);
    return out.toString();
  }

  throw new Error(
    "Backup connection configuration error: refusing to run backup tools without verified TLS " +
      "(set sslaccept=strict with sslcert, or sslmode=verify-full with sslrootcert)"
  );
}

/**
 * Compare two connection URLs without revealing credentials.
 * Returns true when host, port and database name match.
 */
export function sameTargetDatabase(a: string | undefined, b: string | undefined): boolean {
  const pa = safeParse(a);
  const pb = safeParse(b);
  if (!pa || !pb) return false;
  const key = (u: URL) => `${u.hostname.toLowerCase()}:${u.port || "5432"}${u.pathname}`;
  return key(pa) === key(pb);
}
