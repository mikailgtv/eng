# Phase 38 — Deployment Readiness Checklist (proposal, not a deployment)

**Status:** PROPOSAL ONLY. Nothing here was deployed, applied, or validated against a running
orchestrator. This repository contains **no deployment target and no deployment manifest**, and that
absence is accurate rather than an oversight to be fixed by inventing one.

| Question | Answer |
|---|---|
| Does the repo contain a deployment manifest (Dockerfile, compose, k8s, Helm, fly/vercel/netlify, Procfile)? | **No** (verified by exhaustive path check) |
| Does it contain a CI pipeline (`.github/workflows`)? | **No** |
| Is a deployment target documented anywhere? | **No** — only RFC 2606 `*.example.invalid` placeholders |
| Has anything been deployed by this project? | **No** |
| Is production access authorized? | **No** — and not requested |

Every organization-specific value below is a `<PLACEHOLDER>`. Nothing is inferred about the
organization's cloud provider, orchestrator, registry, domain, secret manager, network topology, or
volume configuration. Those are decisions for the organization, listed as `PENDING` in §5.

---

## 1. Invariants any authorized deployment must satisfy

Each row states the requirement, how it is **enforced today**, and where that enforcement lives. An
item marked *checklist-only* is not yet enforced by code and must be verified manually at deployment.

| # | Invariant | Enforced today by | Enforcement class |
|---|---|---|---|
| D-1 | **Strict server-certificate verification** for the database | `auditPostgresTls()` rejects `sslaccept≠strict`, missing `sslcert`, or a downgrading `sslmode`; production startup fails closed | **code** (`src/lib/db-tls.ts`, `src/lib/server-env.ts`) |
| D-2 | **Fail closed** when PostgreSQL TLS configuration is invalid | `server-env.ts` adds the TLS problem and throws during the instrumentation hook — the process does not serve traffic | **code** |
| D-3 | **`STORAGE_PROVIDER=s3` refused** until a real adapter exists | `validateStorageEnv()` throws at startup; preflight rejects it too | **code** |
| D-4 | **No fabricated durability claim** for storage | `getStorageReadiness()` reports real state; readiness returns 503 unless storage is genuinely usable; the gate requires an operator attestation | **code + attestation** |
| D-5 | **Liveness and readiness configured independently** | `/health/live` (no I/O) and `/health` (DB + storage, 200/503) are separate routes | **code** |
| D-6 | **Non-superuser runtime role** | App connects with whatever role the URL specifies — the *role's* privileges are **not** enforced by this repository | **checklist-only** → verify at provisioning (see §4) |
| D-7 | **Credentials out of source control** | `.env` is local; `.env.example` holds placeholders only; secret scan is clean | **process** — enforced by review, not by a hook (no CI exists) |
| D-8 | **Production and staging separated** | Separate `DATABASE_URL` + separate secret scope per environment; the gate refuses production-like targets for staging work | **code (gate) + process** |
| D-9 | **Backups over authenticated TLS** | `resolveBackupConnectionUrl()` refuses to downgrade; a mismatched tooling URL is rejected | **code** (`src/lib/backup/connection.ts`) |
| D-10 | **Restore never targets the live database** | `resolveRecoveryConnectionUrl()` refuses the active database; the gate blocks a non-distinct recovery target | **code** |
| D-11 | **No production deployment path without explicit authorization** | none exists in the repository | **process** |

**Honest limitation:** D-6, D-7 and D-11 are not enforced by code. There is no CI pipeline to enforce
them, and this checklist does not pretend otherwise.

---

## 2. Configuration skeleton (placeholders only — never commit real values)

### 2.1 Environment

```bash
# ---- application ----------------------------------------------------------
# Prisma flavor. sslaccept=strict is the ONLY knob that authenticates the server:
# sslmode alone is silently ignored by the client for verification.
DATABASE_URL='postgresql://<RUNTIME_ROLE>:<SECRET>@<STAGING_DB_HOST>:5432/<STAGING_DB>?sslmode=require&sslcert=<CA_PATH>&sslaccept=strict'

# libpq flavor, used by pg_dump/pg_restore. Different parameter names, same database.
BACKUP_TOOLING_DATABASE_URL='postgresql://<TOOLING_ROLE>:<SECRET>@<STAGING_DB_HOST>:5432/<STAGING_DB>?sslmode=verify-full&sslrootcert=<CA_PATH>'

# Separate disposable restore target. Must NOT be the staging database.
BACKUP_RECOVERY_DATABASE_URL='postgresql://<RESTORE_ROLE>:<SECRET>@<STAGING_DB_HOST>:5432/<RESTORE_DB>?sslmode=verify-full&sslrootcert=<CA_PATH>'

PUBLIC_APP_URL='https://<STAGING_HOST>'
SESSION_SECRET='<SECRET_FROM_SECRET_MANAGER>'
INTEGRATION_SECRET_KEY='<SECRET_FROM_SECRET_MANAGER>'
NEXT_PUBLIC_DEMO_HINTS='false'

# ---- storage: Option A only (Option B needs a real adapter first) ---------
STORAGE_PROVIDER='local'
STORAGE_LOCAL_ROOT='<PERSISTENT_VOLUME_MOUNT>'
STORAGE_DURABILITY_ATTESTED='<yes ONLY after the volume and its snapshot policy are confirmed>'
```

Rules for this block:
- Real values come from `<SECRET_MANAGER>` at deploy time — **never** from a file in this repository.
- `<CA_PATH>` must be the CA that actually signed the staging server certificate, and its SAN must
  match `<STAGING_DB_HOST>`.
- `STORAGE_DURABILITY_ATTESTED` is an operator statement of fact, not a configuration switch. Setting
  it without verifying the volume is falsifying evidence.

### 2.2 Probes

```yaml
# pattern only — the orchestrator, port, path prefix and thresholds are the organization's choice
livenessProbe:
  httpGet: { path: /health/live, port: <APP_PORT> }
  periodSeconds: <N>
  failureThreshold: <N>
readinessProbe:
  httpGet: { path: /health, port: <APP_PORT> }
  periodSeconds: <N>
  failureThreshold: <N>
```

`/health/live` must **never** be used for readiness, and `/health` must **never** be used for
liveness — a database outage would then restart a healthy process. Both return `no-store` +
`nosniff`, and neither body contains credentials, addresses, or tenant data.

### 2.3 Storage volume

```yaml
# illustrative shape only
volumes:
  - name: <VOLUME_NAME>
    mountPath: <PERSISTENT_VOLUME_MOUNT>   # == STORAGE_LOCAL_ROOT
```

**Single-instance constraint:** Option A is only correct while exactly one application instance
mounts the volume. Horizontal scaling requires shared storage or Option B; neither is implemented.

---

## 3. Pre-deployment verification sequence

Run **in this order**; each step's failure stops the deployment.

```bash
# 1. Inputs are structurally usable (no network I/O, prints no values)
npm run staging:ready                    # require exit 0

# 2. Server certificate is genuinely verified — including the rogue-CA probe
node scripts/db/pg-tls-check.mjs         # require 11 passed / 0 failed

# 3. The application fails closed on bad TLS (negative control, safe anywhere)
npm run test:environment
npm run test:db-tls

# 4. Health endpoints behave (only against an authorized environment)
#    live=200 with the database stopped; ready=503; ready=200 after recovery

# 5. Security regression against the deployed staging app (authorized only)
E2E_BASE=https://<STAGING_HOST> node scripts/test-idor-live.mjs   # expect 50 passed / 0 failed
```

Steps 1–3 are safe anywhere. Steps 4–5 require an authorized staging environment and are **NOT RUN**
in this phase.

---

## 4. Provisioning checklist (organization-owned)

- [ ] Dedicated non-production PostgreSQL instance — `<OWNER>`, decision `PENDING`
- [ ] Written authorization naming the database and permitted operations — `PENDING`
- [ ] CA certificate that signed the endpoint's certificate, readable by the app — `PENDING`
- [ ] Application role verified **non-superuser**, no `CREATEDB`, no `CREATEROLE`, no replication,
      no `BYPASSRLS` — verify with `\du <role>` or `pg_roles`, `PENDING`
- [ ] Separate tooling role for migration/backup — `PENDING`
- [ ] Separate disposable restore database for the drill — `PENDING`
- [ ] Persistent volume + mount path + snapshot schedule — `PENDING`
- [ ] Secret-manager entries for every `<SECRET>` above — `PENDING`
- [ ] Orchestrator, registry, domain, network topology — `PENDING` (not inferred here)
- [ ] Probe wiring confirmed **in the orchestrator**, not just at the endpoint — `PENDING`
- [ ] Backup schedule and retention for the database — `PENDING`
- [ ] File snapshot coverage coordinated with database backups — `PENDING`
- [ ] Timeout / connection-limit values measured and applied per role — `PENDING` (see
      `PHASE_36_DATABASE_TIMEOUTS.md`)

---

## 5. What this document deliberately does not do

- It does not name a cloud provider, orchestrator, registry, domain, secret manager, or volume class.
- It does not create a production deployment path.
- It does not claim any orchestrator configuration was tested — **none was**.
- It does not assert that storage is durable. Durability requires operator evidence.
- It does not authorize a deployment. Authorization is a separate, explicit organizational act.

**Nothing was deployed.** This checklist becomes actionable only after the Phase 37 handoff inputs
are supplied and `npm run staging:ready` exits 0.
