# PHASE 32 — Staging Readiness Checklist

**Date:** 2026-10-25
**Verdict: NOT READY TO DEPLOY — external configuration pending + 2 release blockers.**
No infrastructure was invented, provisioned or purchased. No secret values are printed; only presence/absence.

Legend: **CODE** = verified from source and/or a local run · **LIVE** = verified against a running server · **NOT TESTED** = no environment exists.

| # | Control | Status | Evidence |
|---|---|---|---|
| 1 | PostgreSQL staging connectivity | **NOT TESTED — BLOCKED** | `schema.prisma provider = "sqlite"`; no PG host, no `DATABASE_URL` for PG. Nothing to connect to. |
| 2 | Migration status | **BLOCKED** | `prisma migrate status` → **P3019** provider mismatch (`migration_lock.toml = postgresql` vs schema `sqlite`). No `_prisma_migrations` table. See migration report §2. |
| 3 | Schema ↔ DB consistency | **BROKEN in the real DB** | 2 of 213 models drift; runtime `P2022 content_media.originalName does not exist` → file/audio endpoints fail. |
| 4 | Persistent private file storage | **NOT TESTED — BLOCKED** | Default provider `local`; `e2e/storage` is a local directory. Local FS is **not** production-ready (no durability/replication on this host). |
| 5 | Storage encryption & access policy | **CODE only** | `src/lib/storage/policies.ts` marks `content_media=RESTRICTED`, `message_attachment=PRIVATE`, `audio_recording=PRIVATE`, `profile_avatar=PUBLIC`. No bucket, so no SSE/KMS/ACL to inspect. |
| 6 | Signed URLs | **NOT TESTED** | S3 adapter present but unconfigured; `STORAGE_SIGNED_URL_EXPIRY` never exercised. |
| 7 | Backup destination & recovery DB | **CODE + local only** | `BACKUP_DESTINATION`, `BACKUP_RECOVERY_DATABASE_URL`, `BACKUP_ENCRYPTION_KEY` have placeholders in `.env.example`; none set. 22 local backup tests pass. |
| 8 | Required env vars | **PARTIAL** | `.env.example` documents 50 keys with placeholders; `.env` holds only `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_HINTS`. Missing for staging: `PUBLIC_APP_URL`, `STORAGE_*`, `BACKUP_*`, `INTEGRATION_SECRET_KEY`, `WORKFLOW_WORKER_SECRET`. No real `.env` committed. |
| 9 | Session & auth config | **CODE + LIVE** | JWT HS256 (jose), `httpOnly`, `sameSite=lax`, `secure` when `NODE_ENV=production`, 7-day expiry, server-side `UserSession` row revalidated every request, password-version + session-version invalidation. Login/MFA rate limited. Verified live: login → cookie → authorised requests. |
| 10 | HTTPS & secure cookies | **LIVE (partial)** | Cookie `secure` flag is production-only — correct, but untested over TLS. No staging URL exists. |
| 11 | Security headers | **LIVE** | `curl -D-` on the running app returns `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`; `X-Powered-By` absent. **No CSP. No HSTS.** |
| 12 | CSRF / allowed origins | **CODE + LIVE** | `assertSameOrigin()` on mutating routes compares `Origin` host to `Host`/`X-Forwarded-Host`; enforced in the live suite (all mutations carried a matching origin). |
| 13 | Rate limiting | **CODE, single-instance** | In-memory limiter: login 5 failures/5 min, MFA 5/15 min (verified: 429 + `retryAfter`). **Process-local** — does not survive multiple instances or restarts. |
| 14 | Secret-safe logging | **CODE + test** | `npm run test:api-safety` passes; storage/backup logs emit ids, key prefixes and checksum prefixes only; no signed URLs, tokens or PII. |
| 15 | Background jobs / scheduled backups | **NOT IMPLEMENTED** | `BACKUP_SCHEDULE` exists as a placeholder; no scheduler, cron or worker is wired. Backups are manual API calls. |
| 16 | Monitoring / alert delivery | **NOT IMPLEMENTED** | `BACKUP_ALERT_WEBHOOK_URL` / `_EMAIL` / `_SLACK` placeholders only; nothing sends an alert. |
| 17 | DB restore evidence | **PARTIAL (local)** | 22 backup tests pass incl. isolated recovery under a recovery root and target validation that refuses prod/staging names. Only SQLite was restored; **PG restore NOT TESTED**. |
| 18 | Object-storage restore evidence | **NOT TESTED** | Local adapter only; "DB backed up ≠ files backed up" — files backup exists but was never run against a real bucket. |
| 19 | Build / typecheck gate | **CODE (fixed this phase)** | `npm run typecheck` was **failing** (1 syntax error + 5 type errors) → `next build` could not succeed. Now exits clean after this phase's fixes. |
| 20 | Automated security tests | **LIVE** | `node scripts/test-idor-live.mjs` → 50/50 pass, 2 tenants, real routes. 15 helper + 20 storage + 22 backup tests pass. |

## What must happen before a staging deploy

1. Resolve P3019 and apply the two file migrations (else the app boots and then 500s on every file/audio request).
2. Provision PostgreSQL + object storage; set the `.env` keys listed in item 8.
3. Add CSP and HSTS at the edge; verify secure cookies over TLS.
4. Replace the in-memory limiter with a shared store for any multi-instance deployment.
5. Wire a scheduler + alert channel for backups.
6. Re-run `scripts/test-idor-live.mjs` against staging and replace the "NOT TESTED" rows above with real results.

**Nothing in this list was fabricated as passing.** Items marked NOT TESTED have no environment behind them, and are stated as such in the final report.
