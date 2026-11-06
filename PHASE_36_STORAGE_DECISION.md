# Phase 36 / PG-35-02 — Storage Decision Gate

**Status: DECISION REQUIRED. Dependency BLOCKED.**
No cloud provider was chosen, no bucket was created, no credentials were requested, and no external
infrastructure was touched. `STORAGE_PROVIDER=s3` is now **rejected at validation and preflight**, so
the application can no longer report readiness while holding an unusable provider.

## 1. What is true today (verified)

- The S3 implementation is a **stub**: `src/lib/storage/s3.ts` is 105 lines and all 8 operations
  throw. It has never stored a byte.
- Phase 35 confirmed all 8 operations throw at runtime, and that the stub nevertheless *passed the
  old preflight*. That false pass is the defect PG-35-02.
- `local` storage is real and works: verified live in Phase 36 — uploads/downloads across 50/50
  tenant-isolation checks, 4 media objects written to the local root.
- `memory` storage exists for tests and is **rejected in production** (it loses data on restart).
- Readiness now distinguishes `READY` / `UNSUPPORTED` (s3) / `MISCONFIGURED` (memory, or a root that
  is missing/unwritable), and `/health` returns 503 unless storage is genuinely usable.

## 2. The decision

The organisation must choose one of two paths. They are not interchangeable, and neither is
"do nothing" — `local` on an ephemeral filesystem loses uploads on redeploy.

### Option A — Persistent local storage (volume-backed `STORAGE_LOCAL_ROOT`)

**How it behaves.** Files live on a filesystem mount owned by the app. Upload/download already work
against this path today; no adapter is needed.

| Dimension | Assessment |
|---|---|
| Config | `STORAGE_PROVIDER=local` + `STORAGE_LOCAL_ROOT=<mount point>`. No secrets. |
| Upload / download | Already implemented and tested live (Phase 36: 4 objects, cross-tenant denial verified). |
| Backup / restore | **Not covered by the database dump.** The volume must be snapshotted on its own schedule, and DB and volume snapshots must be taken close together or restored-file references will dangle. This is the largest hidden cost of Option A. |
| Multi-instance | **Breaks.** Two instances on separate nodes do not share the mount. Requires a shared filesystem (NFS/RWX volume) which reintroduces a single point of failure and locking concerns. |
| Architecture fit | Current code supports it as-is. No refactor. |
| Cost / prereqs | A persistent volume with a real retention/backup policy. No new dependencies, no cloud vendor lock-in. |

**Verdict:** the only path the current architecture supports **without new code**. Correct while the
deployment is a single instance with a durable volume. Its weakness is not storage — it is the
*backup coupling* and the *multi-instance ceiling*.

### Option B — Complete S3-compatible adapter

**How it would behave.** Object storage over HTTP(S). Would require replacing the 105-line stub with a
real implementation — the stub cannot be "enabled".

| Dimension | Assessment |
|---|---|
| Config / secrets | Endpoint, region, bucket, access key id, secret access key. Secrets must come from a secret manager, never the repo. Rotating them must not require a redeploy of code. |
| All 8 operations | put, get, delete, exists/head, list, copy, signed-URL issue, and metadata/stat must each be implemented and individually tested. An adapter with a working `put` and a stubbed `copy` is not "done". |
| Tenant isolation | Object keys must embed the tenant, and authorization must be enforced **before** signing — prefixed keys are not authorization. Key construction must be centralised so a caller cannot forge a cross-tenant key. |
| Signed URL expiry / policy | Short, explicit TTL; `no-store`; no PII in the signature or the query string; logs must never contain the signed URL. |
| Checksum / metadata | Content hash + length recorded at write and verified at read, so a truncated or swapped object is detected. |
| Delete / copy consistency | Deletes are eventually consistent on some stores; deletes must be idempotent, and partial failures must be surfaced rather than swallowed. `copy` must not silently copy only metadata. |
| Integration tests | Require an **authorized disposable test bucket**, distinct from production, with tests proving cross-tenant denial at the bucket level. |
| Architecture fit | Requires an adapter plus a test bucket. Current abstractions are shaped correctly, but the implementation is absent. |
| Cost / prereqs | Cloud bucket + egress + credential management + a test bucket. Vendor decision required. |

**Verdict:** the only path that survives multi-instance deployment, and the only one where
file backup is delegated to infrastructure that already does it. But it is **real engineering work
against a real bucket**, not a configuration change.

## 3. Consequence of leaving the dependency blocked

With `STORAGE_PROVIDER=s3` the app now **fails to start** (validation) rather than pretending to be
ready. That is the intended outcome: no silent degradation, no false green health check. A
single-instance staging deployment can proceed today on Option A with a durable volume.

What is **not** acceptable: enabling `s3` to "unblock" staging. There is no implementation behind it.

## 4. The exact decision required

- [ ] **Choose A or B.** (A = volume-backed local, single instance. B = implement a full S3 adapter.)
- [ ] If **A**: name the persistent volume, its mount path, and the file-snapshot schedule that is
      coordinated with database backups. State the multi-instance limit as an accepted constraint.
- [ ] If **B**: name the S3-compatible provider, the disposable **test** bucket (distinct from
      production), the secret-manager entry for each credential, and the signed-URL TTL.
- [ ] If **B**: authorize the work as its own phase — the adapter plus its integration tests is not a
      Phase 36-scale change.

**Blocked dependency:** object storage. Owner of the decision: the organisation. Until it is made,
storage readiness is honest (`local` = usable, `s3` = refused) and staging file persistence is
**unproven beyond the local volume**.
