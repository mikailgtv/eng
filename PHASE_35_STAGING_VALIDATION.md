# Phase 35 — Staging Validation Report

Scope: 35B discovery, 35C TLS, 35D migration, 35E deployment/health, 35G live security.
Every row states the environment it applies to.

**Environment key:** **E1** SQLite disposable copy · **E2** local disposable PostgreSQL, no TLS
(Phase 34) · **E3** local disposable PostgreSQL **with real TLS** · **E4** **organizational
staging PostgreSQL (NOT SUPPLIED)** · **E5** **organizational object storage (NOT SUPPLIED)**

---

## 1. 35B — Staging availability

| Question | Answer | Evidence |
|---|---|---|
| Is `PG_STAGING_DATABASE_URL` supplied for a real endpoint? | **No** | 0 `PG_STAGING_*` variables in the environment |
| Are storage credentials supplied? | **No** | 0 `S3_*` / `AWS_*` / `STORAGE_*` variables |
| Is a staging application URL supplied? | **No** | not in `.env` or environment |
| Is any secret-manager reference supplied? | **No** | none present |
| Is a CA/certificate for a real provider supplied? | **No** | none present |
| Does `.env` contain staging config? | **No** | keys are `DATABASE_URL` (SQLite), `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_HINTS` |
| Does `.env.example` document the surface? | **Yes — placeholders only** | `STORAGE_S3_*`, `BACKUP_*`, `PUBLIC_APP_URL`, … |

**Result: E4 and E5 do not exist. No staging validation was performed, and no local server was
substituted for them.**

The Phase 34 file `/tmp/pg34.env` still exists; it configures the **local disposable** cluster and
is explicitly not staging. It was not used as a stand-in for E4.

---

## 2. 35C — TLS and connection security (environment: E3)

### 2.1 Server construction

| Property | Value |
|---|---|
| Server | PostgreSQL **17.11** (Debian 13) |
| `ssl` | `on` |
| CA | private, `CN=LMS Phase35 Test CA`, 2048-bit RSA, 365 days |
| Server certificate | `CN=localhost`, **SAN `DNS:localhost` only** (no IP SAN — deliberate) |
| Negotiated | **TLSv1.3**, `TLS_AES_256_GCM_SHA384`, 256-bit |
| Client certificates | not required (`client_dn` empty) |

The missing IP SAN is intentional: it makes hostname verification *provable* by connecting to
`127.0.0.1` and requiring rejection.

### 2.2 Verification matrix

| # | Client | Configuration | Expected | Actual | Status |
|---|---|---|---|---|---|
| 1 | psql | `verify-full` + correct CA + `localhost` | connect | connected, TLSv1.3, `ssl=true` | PASS |
| 2 | psql | `verify-full` + **unrelated CA** | reject | `SSL error: certificate verify failed` | PASS |
| 3 | psql | `verify-full` + `127.0.0.1` (not in SAN) | reject | `server certificate for "localhost" … does not match host name "127.0.0.1"` | PASS |
| 4 | psql | `disable` | connect, plaintext | connected, `ssl=false` | control |
| 5 | Prisma Client | **`sslaccept=strict` + correct CA** | connect | connected, TLSv1.3 | **PASS** |
| 6 | Prisma Client | `sslaccept=strict` + unrelated CA | reject | `certificate verify failed` | **PASS** |
| 7 | Prisma Client | `sslaccept=strict` + wrong hostname | reject | `certificate verify failed` | **PASS** |
| 8 | Prisma CLI | `sslaccept=strict` + unrelated CA | reject | `P1011` | **PASS** |
| 9 | Prisma CLI | `sslaccept=strict` + wrong hostname | reject | `P1011` | **PASS** |
| 10 | Prisma Client | `sslmode=verify-full` + unrelated CA | reject | ⚠️ **CONNECTED** | **FAIL (PG-35-01)** |
| 11 | Prisma Client | `sslmode=verify-full` + wrong hostname | reject | ⚠️ **CONNECTED** | **FAIL (PG-35-01)** |
| 12 | Prisma Client | `sslmode=totally-bogus-mode` | reject | ⚠️ **CONNECTED** | **FAIL (PG-35-01)** |
| 13 | Prisma CLI | `sslmode=verify-full` + unrelated CA | reject | ⚠️ **CONNECTED** | **FAIL (PG-35-01)** |
| 14 | Prisma Client | `sslaccept=accept_invalid_certs` + rogue CA | reject | ⚠️ connected (documented insecure) | control |

**Interpretation:** rows 1–9 show that both stacks *can* authenticate a server correctly. Rows
10–13 show that the parameter name most engineers would reach for (`sslmode=verify-full`) is
silently inert in Prisma. Row 14 confirms `accept_invalid_certs` is the engine default when
`sslaccept` is absent — which is exactly why rows 10–13 connect.

### 2.3 Application-level result (`pg-tls-check.mjs`, environment E3)

| Check | Result |
|---|---|
| CA parses, not expired | PASS — `CN=LMS Phase35 Test CA`, exp 2027-10-25 |
| Client connects | PASS |
| Connection encrypted | PASS — `ssl=true` |
| Modern TLS | PASS — TLSv1.3 |
| **Rogue CA rejected** | **PASS — "connection refused as required"** |
| Role not superuser | PASS — `rolsuper=false` |
| Role cannot create databases | PASS — `rolcreatedb=false` |
| Role cannot create roles | PASS — `rolcreaterole=false` |
| No replication privilege | PASS — `rolreplication=false` |
| Does not bypass RLS | PASS — `rolbypassrls=false` |
| Limits observed | `max_connections=100`, `statement_timeout=0`, `idle_in_transaction_session_timeout=0` |

**11 passed, 0 failed.** Against the Phase-34-style URL the same tool reports **2 failed** with the
message *"TLS is encrypted but UNAUTHENTICATED"* — i.e. the checker catches the defect it was built
to catch.

### 2.4 What E3 does **not** prove

- That the organization's TLS terminator, proxy, or CA behaves this way.
- Certificate chains with intermediates, CRLs/OCSP, or hostname patterns.
- Mutual TLS.
- Anything at all about **E4**, because E4 does not exist.

---

## 3. 35D — Migration and structural verification (environment: E3)

From a **completely empty** schema, over verified TLS:

| Step | Result |
|---|---|
| `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` | 0 tables |
| `pg-preflight.mjs` | **STATUS: READY** — same-database parity check passed |
| `pg-migrate.mjs deploy --yes` | 5 migrations, **exit 0** |
| `pg-migrate.mjs status` | "Database schema is up to date!" |
| `pg-migrate.mjs diff` | **"No difference detected."** |
| `pg-verify-structure.mjs` | **40 passed, 0 failed** |

Migration history (`_prisma_migrations`, over TLS):

```
20261007183000_postgresql_baseline          finished
20261010000000_phase30_storage_metadata     finished
20261010000001_phase32_tenant_isolation     finished
20261010000003_phase34_content_media_fk     finished
20261010000004_phase34_drop_updatedat_default finished
```

All finished, none rolled back. No row was inserted by hand, and no migration was recreated.

Phase 34 fixes re-verified **over TLS** by direct catalog query:

| Item | Observed |
|---|---|
| `content_media_organizationId_fkey` | present |
| `confdeltype` | `n` → `ON DELETE SET NULL` |
| `content_media.updatedAt` column default | **NONE** |
| `message_attachments.updatedAt` column default | **NONE** |

Structure totals: 213 application tables, 278 foreign keys, 102 non-PK unique indexes, 0 invalid
constraints, every table primary-keyed.

---

## 4. 35E — Deployment and health (environment: E3)

### 4.1 Configuration selection

| Requirement | Result |
|---|---|
| Prisma Client generated for the PostgreSQL workspace | yes (`--schema prisma/postgresql/schema.prisma`) |
| Runtime URL supplied explicitly (not defaulted) | yes — `DATABASE_URL` from a mode-600 file outside the repo |
| `STORAGE_LOCAL_ROOT` explicitly set | yes (Phase 34 finding PG-34-04 made this mandatory) |
| Startup validation runs | yes — `instrumentation.ts` → `validateServerEnvironment()` |
| Silent SQLite fallback possible | **no** — production requires a `postgresql://` URL |
| Developer default workflow unchanged | yes — committed provider still `sqlite` |

Production preflight behaviour (executed, synthetic config):

| Config | Result |
|---|---|
| `NODE_ENV=production` + SQLite URL | **FAIL** — "SQLite is not approved for production" |
| `NODE_ENV=production` + `STORAGE_PROVIDER=s3` | **PASS** ⚠️ — despite S3 being a stub (PG-35-02) |
| `NODE_ENV=production` + `ALLOW_DEMO_SEED=true` | FAIL |
| `NODE_ENV=production` + `NEXT_PUBLIC_DEMO_HINTS≠false` | FAIL |

### 4.2 Health semantics

| Probe | DB up | DB down | Assessment |
|---|---|---|---|
| `GET /health` | **200** `{"status":"healthy"}` | **503** `{"status":"unavailable"}` | correct as **readiness** |
| `GET /` | — | **307** in 280 ms | process **alive** |
| `POST /api/auth/login` | 200 | **500** `INTERNAL_ERROR` + `requestId` | **fails closed** |

`/health` does not separate liveness from readiness (PG-35-04): a liveness probe pointed at it
would kill a healthy process during a database outage. The recommendation is a separate liveness
route that performs no database I/O.

Response headers: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. Body carries no
component detail, no version, no connection information.

### 4.3 Failure and recovery

| Step | Observation |
|---|---|
| Database stopped | `/health` 503 in 88 ms; `/` 307; login 500 |
| Client body inspected | no host, port, database, credential, or stack fragment |
| Server log | `{"level":"error","event":"api.unhandled","requestId":"238073f8-…","errorType":"PrismaClientKnownRequestError"}` |
| `requestId` correlation | matches the client response |
| Database restarted, **app not restarted** | `/health` 200 in 130 ms; login 200 `success: true` |

**No silent fallback was observed or is reachable:** with the database down, an authenticated login
failed with 500 rather than returning fixture data from a SQLite file.

### 4.4 Log hygiene

Reviewed the full request log of the TLS run. It contains method, path, status, duration; structured
`{level,event,requestId,errorType}` records; and `[storage:DOWNLOAD_AUTH_FAILURE]`
`{event,fileId,actorId,timestamp}`. It contains **no** connection strings, passwords, password
hashes, session tokens, signed URLs, or learner PII (no email addresses appear).

---

## 5. 35G — Live security suite (environment: E3)

| Property | Value |
|---|---|
| Target | `http://127.0.0.1:4035` — app on E3 |
| Provider | PostgreSQL 17.11 over **TLSv1.3** |
| Cases | **50** (16 authorized-workflow + 34 denial) |
| Passed / failed | **50 / 0** |
| Skipped | 0 |
| Evidence | `e2e/pg35/live-results-tls-postgresql.json` |
| Fixtures | `e2e/pg35/fixtures-tls-postgresql.json` |
| Coupling confirmed | `pg_stat_ssl`: **3 of 3** application connections TLS |

Functional areas exercised by the suite: authentication and session issuance, tenant-scoped user
listing and profile reads, lesson access grants, attendance recording, assignment publishing,
assessment retrieval, group and user mutation, content export, media and message-attachment
download, role and permission administration, and backup administration.

| Area | Verified |
|---|---|
| Authentication / session revalidation | PASS |
| Lesson and module retrieval | PASS (`POST /api/lessons/{id}/access` 200) |
| Assessment workflows | PASS (`GET /api/assessments/{id}` 200) |
| Progress tracking | PASS (own lesson only) |
| Messaging attachments | PASS (own tenant 200; cross-tenant 404) |
| Media ownership | PASS (own tenant 200; cross-tenant 404) |
| Admin-only backup operations | PASS (admin 201/403 as appropriate; learner/teacher 403) |
| Tenant isolation / IDOR | PASS (34/34 denials) |

**This is an E3 result, not an E4 result.** It says the application enforces its security model
correctly when running on PostgreSQL over TLS. It says nothing about the organization's network,
identity provider, or staging deployment.

---

## 6. Summary by environment

| Environment | What was validated | Status |
|---|---|---|
| **E1** SQLite disposable copy | rehearsal 22/0, verify 38/0 | PASS |
| **E2** local PG, no TLS | historical Phase 34 evidence, re-verified structurally | PASS (historical) |
| **E3** local PG + TLS | TLS matrix, migrations, structure, health, 50-case suite, backup at volume | **PASS** |
| **E4** organizational staging PostgreSQL | — | **BLOCKED: not supplied** |
| **E5** organizational object storage | — | **BLOCKED: not supplied, and adapter unimplemented** |

Per instruction, no result from E1/E2/E3 is presented as evidence for E4 or E5.
