# Phase 38 — Storage Decision Record

**Status:** `DECISION PENDING` — unresolved, and deliberately **not** made on the organization's behalf.
**Supersedes nothing:** this record restates `PHASE_36_STORAGE_DECISION.md` accurately and adds the
decision fields that must be filled before either option can proceed.

---

## 0. Facts that constrain the decision

| Fact | Evidence |
|---|---|
| The S3 adapter is an **unimplemented stub**; all 8 operations throw | `src/lib/storage/s3.ts` (105 lines, every method throws) |
| `STORAGE_PROVIDER=s3` is **refused at startup and at preflight** | `validateStorageEnv()` throws; `check-env.mjs` rejects; verified live (startup aborted) |
| Local storage **works** and is tenant-isolated | 50/50 isolation suite + 21/21 storage regression (Phase 36, local) |
| A successful write does **not** prove durability | Filesystem writability ≠ persistence across restart/redeploy/node loss |
| The database backup does **not** cover uploaded files | Dumps contain rows, not blobs |

---

## 1. Option A — persistent local volume

**What it is.** Files live on a filesystem mount owned by the application, addressed through
`STORAGE_LOCAL_ROOT`. No adapter work required; the implementation already exists.

| Dimension | Position |
|---|---|
| Implementation cost | **Zero** — already implemented and tested |
| Durability | Only as good as the mounted volume; **requires a real persistent volume, not a container's ephemeral filesystem** |
| Required evidence | Confirmed mount path + snapshot mechanism + **operator attestation** (`STORAGE_DURABILITY_ATTESTED`). The gate will not infer durability from writability. |
| Snapshot arrangements | Must exist and be **coordinated with database backups**, or restored rows will reference files that no longer exist (and vice versa) |
| File recovery | A **separate recovery domain** from database recovery; needs its own tested restore path |
| Multi-instance | **Breaks.** Two instances on separate nodes do not share a local mount. Remains single-instance unless shared-storage behaviour is separately implemented **and tested** — it is not today |
| Cost / prerequisites | A durable volume with a documented retention policy. No new dependencies, no vendor lock-in |

**Accurate summary:** the only option the current architecture supports without new code, and it is
correct **only** for a single instance with a genuinely durable, snapshotted volume whose restoration
is tested alongside the database.

---

## 2. Option B — S3-compatible adapter

**What it is.** Object storage over HTTPS. Requires replacing the stub with a real implementation of
**all eight** operations: put, get, delete, exists/head, list, copy, signed-URL issue, metadata/stat.

| Dimension | Position |
|---|---|
| Availability | **Not available.** The adapter does not exist; environment variables alone do not create it |
| Required organizational acts | Explicit decision to adopt it; approved provider; approved disposable **test** bucket distinct from production; secure secret-manager configuration |
| Required engineering | A separately scoped implementation **and validation phase** — adapter plus integration tests against the real test bucket. This is not a configuration change and not a Phase 38-scale task |
| Tenant isolation | Object keys must embed the tenant, with authorization enforced **before** signing. A prefixed key is not an authorization boundary |
| Signed URLs | Short, explicit TTL; `no-store`; no PII in the signature or query string; never logged |
| Integrity | Checksum + length recorded at write and verified at read |
| Consistency / failure | Deletes idempotent; partial failures surfaced, never swallowed; `copy` must not silently copy only metadata |
| Backup posture | File durability and versioning become infrastructure concerns, which mostly removes the file-snapshot burden of Option A |
| Cost / prerequisites | Bucket, egress, credential management, a test bucket, and a vendor decision |

**Accurate summary:** the only option that survives multi-instance deployment, but it is real
engineering against a real bucket — not a flag to flip.

---

## 3. Decision fields — all `PENDING`

| # | Field | Option | Value |
|---|---|---|---|
| 1 | Selected option (A or B) | — | `PENDING` |
| 2 | Decision owner (named) | — | `PENDING` |
| 3 | Decision date | — | `PENDING` |
| 4 | Persistent volume name | A | `PENDING` |
| 5 | Mount path (== `STORAGE_LOCAL_ROOT`) | A | `PENDING` |
| 6 | Snapshot mechanism and schedule | A | `PENDING` |
| 7 | Coordination plan with database backups | A | `PENDING` |
| 8 | Confirmation the deployment is single-instance | A | `PENDING` |
| 9 | File-restore procedure and its last test date | A | `PENDING` |
| 10 | Approved S3-compatible provider | B | `PENDING` |
| 11 | Production bucket vs. **disposable test** bucket | B | `PENDING` |
| 12 | Secret-manager entries for endpoint, region, bucket, key id, secret | B | `PENDING` |
| 13 | Signed-URL TTL | B | `PENDING` |
| 14 | Implementation + validation phase id | B | `PENDING` |
| 15 | Date the adapter was accepted for use | B | `PENDING` |

---

## 4. What is **not** a decision

The following do **not** constitute choosing Option B, and must never be treated as making S3
available:

- setting `STORAGE_PROVIDER=s3` (the application refuses to start),
- possessing bucket credentials,
- adding `STORAGE_S3_*` variables (they are no longer even listed as "required" — that would imply
  that supplying them would help),
- an unvalidated mock, a design sketch, or a passing unit test of a stub.

Likewise, configuring a local directory is **not** choosing Option A — the choice requires the
durability, snapshot, and recovery evidence above.

---

## 5. Consequence while the decision is open

- File-workflow acceptance **cannot** be declared for staging.
- Staging may run on `STORAGE_PROVIDER=local` **for database-only validation**, provided the operator
  does not claim durable file storage without attestation.
- Damage assessment for users: **no user data is at risk from leaving this open** — the risk is that
  a file workflow is declared "working" on storage whose durability nobody has verified.

The next action on this record is an organizational decision, not an engineering task.
