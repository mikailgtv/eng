# PHASE 33 — Data Integrity Report

**Date:** 2026-10-25
**Scope:** the migrated disposable copy vs the untouched source `prisma/dev.db`.

Source integrity: `sha256 e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`, 4,517,888 bytes — **identical before and after every operation performed in this phase**.

---

## 1. Row counts (source → migrated)

| Table | Source | Migrated | |
|---|---:|---:|---|
| users | 87 | 87 | ✓ |
| organizations | 1 | 1 | ✓ |
| user_organizations | 87 | 87 | ✓ |
| learning_groups | 5 | 5 | ✓ |
| roles | 8 | 8 | ✓ |
| user_roles | 6 | 6 | ✓ |
| permissions | 49 | 49 | ✓ |
| courses | 4 | 4 | ✓ |
| modules | 9 | 9 | ✓ |
| lessons | 39 | 39 | ✓ |
| class_assignments (homework) | 15 | 15 | ✓ |
| assignment_submissions | 7 | 7 | ✓ |
| assessments | 4 | 4 | ✓ |
| assessment_attempts | 0 | 0 | ✓ |
| class_sessions | 15 | 15 | ✓ |
| attendance_records | 7 | 7 | ✓ |
| messages | 0 | 0 | ✓ |
| message_attachments | 0 | 0 | ✓ |
| content_media | 0 | 0 | ✓ |
| **audit_logs** | **647** | **647** | ✓ |

Verified by `npm run db:verify` → **38 passed, 0 failed**.

Two tables are empty in this dataset (`content_media`, `message_attachments`). That is precisely why the empty-table rehearsal on real rows matters — see §3.

## 2. Relationship and record preservation

| Check | Result |
|---|---|
| A real user row is byte-identical after migration (id, username, role, **password hash**, organizationId) | ✓ |
| User → organization links intact (every user has an organization; 1 org bucket) | ✓ |
| A real lesson keeps its `moduleId` (course → module → lesson chain) | ✓ |
| Audit history preserved exactly (647 rows, no rewrite) | ✓ |
| Class assignments, sessions and attendance records unchanged in count | ✓ |
| `PRAGMA integrity_check` | ✓ ok |
| `PRAGMA foreign_key_check` (after the rebuild) | ✓ 0 violations |

Authentication is untouched: password hashes are copied verbatim, so existing users can still sign in, and no session/credential table was altered.

## 3. Preservation through the table rebuild (the risky step)

The Phase 33 migration recreates `content_media` and `message_attachments` (SQLite cannot add a foreign key otherwise), copying every row:

```
INSERT INTO "new_content_media" (…) SELECT … FROM "content_media";
DROP TABLE "content_media";
ALTER TABLE "new_content_media" RENAME TO "content_media";
```

Because the real database has **zero** rows in these tables, an empty-table rehearsal would prove nothing. Synthetic legacy rows were therefore written with raw SQL (old column set only) into the disposable copy **before** migrating:

| Row | Situation | After migration | Expected |
|---|---|---|---|
| `reliable-owner.pdf` | uploader belongs to an organization | survives; `sizeBytes=12` kept; `organizationId` = uploader's org; `accessLevel='RESTRICTED'`; `updatedAt` non-null | ✓ |
| `ambiguous-owner.pdf` | uploader has **no** organization | survives; `organizationId` **still NULL** | ✓ never guessed |
| `pre-migration.pdf` (attachment) | message link | survives; `messageId` unchanged; `accessLevel='PRIVATE'`; `updatedAt` non-null | ✓ |

## 4. Ambiguous tenant ownership

- No record was assigned a tenant that could not be established. Backfill is conditional on the uploader's `organizationId` being non-null.
- Rows that remain NULL are **not** silently readable: `readContentMedia` denies NULL-tenant files when more than one organization exists (SUPER_ADMIN excepted and audited), which is exactly the Phase 32 behaviour.
- No NULL-tenant row is created by the migration itself.

## 5. Access-control behaviour preserved

Re-verified live on the migrated database (50/50):

- authorized owner reads own media/attachment → 200
- other tenant → 404, learner reading media → 404
- unauthenticated → 401
- tenant checks read the newly added `organizationId`, so the migration **strengthens** rather than weakens isolation
- audit rows written for cross-tenant SUPER_ADMIN access remain (metadata limited to org ids)

## 6. Files

No file on disk was read, moved, rewritten or deleted. The storage root (`e2e/storage`) is only touched by the synthetic fixtures used for HTTP tests. The migration changes metadata columns only — it never touches object bytes.

## 7. What this report does not claim

- PostgreSQL row preservation: **NOT TESTED** (no server).
- Restoration from a backup into an isolated target: covered by the Phase 31 suite on SQLite only.
- `next build`: not executed (typecheck is clean).
