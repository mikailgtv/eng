# Phase 35 — Object Storage Validation Report

Scope: 35F. Covers the storage abstraction, the local filesystem provider, the S3-compatible
provider, and — definitively — why S3 cannot be validated today.

**Environment key:** **E3** local disposable PostgreSQL + TLS · **E5** organizational object
storage (**NOT SUPPLIED**)

---

## 1. Bottom line

| Question | Answer |
|---|---|
| Is the local filesystem provider validated? | **Yes (E3)** — upload, metadata, download, authorization and cross-tenant denial all exercised |
| Is S3-compatible storage validated? | **No — and it cannot be, because it is not implemented** |
| Is an organizational staging bucket available? | **No** (E5 not supplied) |
| Can the application be deployed with `STORAGE_PROVIDER=s3` today? | **No.** Every operation throws |
| Does configuration validation catch that? | **No.** It passes, which is the dangerous part |

**Status for organizational object storage: `BLOCKED`.** Local filesystem tests are **not** S3
success and are not reported as such.

---

## 2. What exists in the storage abstraction

| Component | File | Assessment |
|---|---|---|
| Provider selection | `src/lib/storage/index.ts` | `local` \| `s3` \| `memory`; `memory` rejected in production |
| Root resolution | `src/lib/storage/index.ts` | `<cwd>/storage` default — the Phase 34 footgun (PG-34-04) |
| Key safety | `src/lib/storage/keys.ts` | `validateObjectKey` rejects `..`, backslashes, absolute paths, control characters, leading `/` or `.`; `resolveSafePath` confines resolved paths to the root |
| Upload/download/delete with audit | `src/lib/storage/service.ts` | `secureUpload`, `secureDownload`, `secureDelete` — all take an `actorId` and emit audit actions |
| Per-kind policies | `src/lib/storage/policies.ts` | allowed extensions, MIME types, max size, access level (`PUBLIC`/`PRIVATE`/`RESTRICTED`) |
| Reliability / monitoring | `src/lib/storage/reliability.ts`, `monitoring.ts` | retry and failure-event helpers |
| Local provider | `src/lib/storage/local.ts` | implemented; used for all successful tests |
| S3 provider | `src/lib/storage/s3.ts` | **stub — 105 lines, no SDK, every operation throws** |

The *design* around storage is sound: keys are validated, policies are per-resource, and access
decisions are application-enforced. The gap is that one of the two real backends does not exist.

---

## 3. S3-compatible provider — **NOT IMPLEMENTED** (finding PG-35-02)

`src/lib/storage/s3.ts` describes itself as a "skeleton" and states that a real implementation
needs `@aws-sdk/client-s3`. No AWS, S3, or MinIO package is installed:

```
NO aws-sdk / s3 / minio package installed
```

### 3.1 Runtime behaviour, measured

Instantiated with a complete, valid-looking configuration
(`bucket`, `region`, `accessKeyId`, `secretAccessKey`) and exercised across the full adapter
interface:

| Operation | Result |
|---|---|
| `upload` | **THREW** — "S3 upload not implemented without SDK and endpoint" |
| `download` | **THREW** — "S3 download requires SDK" |
| `exists` | **THREW** |
| `getMetadata` | **THREW** |
| `generateSignedUrl` | **THREW** — "S3 signed URL generation requires SDK" |
| `delete` | **THREW** |
| `copy` | **THREW** |
| `verifyChecksum` | **THREW** |

**8 of 8 operations fail.** There is no partial S3 capability.

### 3.2 Why this is worse than "unvalidated"

Configuration validation does **not** catch it:

| Validator | `STORAGE_PROVIDER=s3` with all vars set |
|---|---|
| `src/lib/server-env.ts` | accepts `s3`; requires `STORAGE_S3_BUCKET`, `_REGION`, `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`; passes when present |
| `scripts/production/check-env.mjs` | **"Production environment preflight passed."** |
| Unit test `env: s3 requires vars` | passes — it only checks that *missing* vars are rejected |

So a deployment can pass every preflight, report `/health` as `healthy`, and then fail on the first
agent upload of a PDF or audio file. Because tenant media (`content_media`, `message_attachments`)
is a core feature, this is a **HIGH** severity blocker for any S3-backed deployment.

**Honest correction to Phase 34:** Phase 34 listed "S3 object storage remains unverified". The
accurate statement is that **S3 is unimplemented**. The distinction matters: "unverified" invites
someone to verify it, which would have ended in a confusing 500 at runtime rather than at design
time.

### 3.3 Signed-URL policy — present but unreachable

`generateSignedUrl` validates `expiresInSeconds` (must be `> 0` and `≤ 3600`), and
`server-env.ts` independently caps `STORAGE_SIGNED_URL_EXPIRY` at 3600, before the adapter throws.
The policy is correct; it simply cannot be exercised because no URL can be produced.

**Therefore, the following Phase 35F requirements are `BLOCKED`, not passed:**

- signed URL scope and expiry against a live provider;
- upload of a real object and metadata persistence;
- download and deletion against a live bucket;
- cross-tenant download/delete by identifier manipulation against S3 keys;
- missing objects, interrupted uploads, and provider-side failures on S3;
- object-byte backup and recovery.

---

## 4. Local filesystem provider — validated (environment: E3)

| Property | Result | Evidence |
|---|---|---|
| Upload + metadata persistence | PASS | fixtures written to `e2e/storage/content/e2e/` and `.../message_attachment/e2e/`; rows in `content_media` / `message_attachments` |
| Own-tenant download | PASS | `L05` teacher A media → **200**; `L06` student A attachment → **200** |
| Cross-tenant download denied | PASS | `D*` cases → **404** for tenant B actors |
| Unauthenticated access denied | PASS | `D33` → **401** |
| Storage unit-level security | PASS | `npx tsx scripts/test-storage-regression-simple.mjs` → **20 passed, 0 failed** (includes "env: memory rejected in production", "s3 requires vars", key-escape rejection) |
| Key traversal protection | PASS | "file keys cannot escape namespace" (`test-idor-simple.mjs`, 15/0) |
| Auditability | PASS | `secureDownload`/`secureDelete` emit audit records; `DOWNLOAD_AUTH_FAILURE` events observed for denied downloads |

**Run note (PG-35-07):** `src/lib/storage/__tests__/storage.test.ts` requires `vitest`, which is not
installed, so it cannot run as-is. The working invocations are the `scripts/test-*-regression*.mjs`
runners under `npx tsx`. My first attempt used `node` and produced `ERR_UNKNOWN_FILE_EXTENSION`;
that was an operator error, not a defect.

### 4.1 Local provider limitations that matter for staging

| Limitation | Consequence |
|---|---|
| Requires a **persistent** filesystem | A container without a volume loses all uploaded objects on restart while the database keeps the metadata rows |
| No replication or durability guarantee | Object bytes are outside database backup/restore |
| Single-node only | No horizontal scaling of the app tier without shared storage |
| `STORAGE_LOCAL_ROOT` defaults to `<cwd>/storage` | A misconfigured staging app 404s on every download while looking like an authorization failure (Phase 34, PG-34-04) |
| `STORAGE_STAGING_ROOT` is rejected in production | Deliberate guard against prod/staging path overlap — good |

---

## 5. Backup coverage, split correctly

Per standing constraint, **database backup does not imply object backup**. They are separate:

| Asset | Covered by Phase 35H? | Notes |
|---|---|---|
| Database metadata (`content_media`, `message_attachments` rows) | **Yes** | included in `pg_dump` / `pg_restore`, verified at 20k-user volume |
| Object bytes (files on disk) | **No** | filesystem; a database restore leaves metadata pointing at objects that may not exist |
| Object bytes on S3 | **No** | provider unimplemented |

**Consequence:** a restore drill that only restores PostgreSQL produces a database whose media rows
may reference files that are not present. This must be treated as an integrity risk in any staging
or production recovery plan, and it is why §4.1's "persistent volume" requirement is not optional.

---

## 6. What the owner must decide

1. **Is S3 required for staging?**
   - **If yes** → the adapter must be implemented (install `@aws-sdk/client-s3`, implement
     upload/download/exists/delete/signed URLs/checksum, then re-run this validation). This is
     functional development, explicitly outside the "no new features" scope of Phase 35.
   - **If no** → staging runs on `STORAGE_PROVIDER=local` with a **persistent volume**, and the
     absence of durability/replication/backup for objects is accepted in writing.
2. **Who supplies the bucket?** A dedicated staging bucket or prefix, least-privilege credentials,
   and an explicit statement that no production bucket may be referenced.
3. **Is object-byte backup in scope?** If yes, it needs its own mechanism and its own drill; the
   database backup does not cover it.

Until 1–3 are answered, this report's status for object storage is **BLOCKED** and must not be
summarised as "storage validated".
