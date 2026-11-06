# Phase 36 / PG-35-05 — PostgreSQL Timeout & Connection-Limit Guidance

**Status: DOCUMENTATION ONLY. No values were applied to any cluster, config file, or connection string.**
Nothing in this document has been deployed. The disposable local cluster used in Phases 35–36 was
inspected read-only and then destroyed.

## 1. Why this is documentation and not a code change

The Phase 35 finding (PG-35-05, **LOW**) was that the application sets no server-side runaway-query
guard. Choosing a value is an operational decision that depends on the workload profile of the
organisation's staging/production database — it is not a defect that can be fixed by inventing a
number. Applying an unverified `statement_timeout` can abort legitimate long-running reports and
migrations; applying an unverified `idle_in_transaction_session_timeout` can abort application
transactions mid-request. Both are outages in waiting.

Therefore: **no default was added, no migration was created, and no `ALTER SYSTEM` / `ALTER ROLE` /
`ALTER DATABASE` statement is included in the repository as an applied change.**

## 2. Live observation from the disposable local cluster (evidence, not a recommendation)

Captured by `scripts/db/pg-tls-check.mjs` during Phase 36, against the throwaway PostgreSQL 17
cluster, before teardown:

| Setting | Observed value | Reading |
|---|---|---|
| `max_connections` | 100 | package default |
| `statement_timeout` | 0 | **unlimited** — a runaway query can hold a connection forever |
| `idle_in_transaction_session_timeout` | 0 | **unlimited** — a stuck transaction holds locks indefinitely |
| `idle_session_timeout` | 0 | unlimited |
| application role `rolconnlimit` | unlimited | no per-role connection cap |

These are stock defaults. The two `0` values are the actual risk: they are permissive because the
server never acts on a stuck client.

## 3. The three settings that matter, and what each one protects

**`statement_timeout`** — server-side ceiling on a single statement. Protects the database from one
query consuming a connection (and CPU) indefinitely. Risk of setting it too low: legitimate bulk
reports, exports, and data migrations fail. Migrations run through `prisma migrate` are especially
sensitive — a timeout mid-migration can leave a partially applied change.

**`idle_in_transaction_session_timeout`** — reaps sessions that opened a transaction and stopped
sending statements. Protects against a crashed/blocked client holding row locks forever. Risk of
setting it too low: a request that legitimately pauses between statements inside an explicit
transaction is killed mid-flight.

**`idle_session_timeout`** — reaps sessions that are connected but idle *outside* a transaction.
Mainly relevant with connection poolers; can churn legitimate pooled connections if set below the
pooler's idle window.

## 4. Recommendation, deliberately unvalued

1. Do **not** set these globally on the cluster (`ALTER SYSTEM`) from application code. A shared
   cluster hosts other consumers; a global timeout is their outage too.
2. If applied, scope them per role or per database
   (`ALTER ROLE <app_role> SET statement_timeout = ...`), so tooling and migrations can be exempted.
3. Keep the **migration/tooling role** on a longer or no `statement_timeout`, and the **application
   role** on a shorter one. The application and tooling already use separate URLs in this codebase
   (`DATABASE_URL` vs `BACKUP_TOOLING_DATABASE_URL`), so this split is compatible with the current
   architecture.
4. Set `statement_timeout` **above** the slowest known-good request and above the longest migration,
   measured — not guessed. Measure first with `pg_stat_statements`, then choose.
5. Verify the chosen values with a live query (`SHOW statement_timeout;` on the application role's
   own session), not by reading the config file. A config file proves intent, not effect.
6. Treat connection limits and pooling as a separate decision: `max_connections` is per-cluster, and
   the app currently opens connections through Prisma's pool. Sizing must account for the number of
   app instances × pool size, plus tooling and migrations. **No pool size was changed here.**

## 5. What the organisation must decide

Exact decisions required before any of these values change in staging:

- [ ] Target values for `statement_timeout` and `idle_in_transaction_session_timeout`, with the
      measurement that justifies each.
- [ ] Whether they are set per role, per database, or via the connection string (`options=-c ...`).
- [ ] Which role is exempt (migrations/tooling) and how that exemption is enforced.
- [ ] Connection budget: instances × pool size, against the cluster's `max_connections`.

Until those are answered, this finding stays **documented-only, not remediated by configuration**,
and is listed as an open operational item — not a closed defect.

## 6. Verification status

| Claim | Status | Basis |
|---|---|---|
| App sets no `statement_timeout` | VERIFIED | `pg-tls-check.mjs` read `0` from the live cluster |
| No timeout values were applied by Phase 36 | VERIFIED | no `ALTER *` in repo; cluster destroyed |
| Recommended values are safe for this workload | **NOT TESTED** | requires the organisation's workload data |
| A justified default could be added | **NOT DONE, by design** | see §1 |
