# PHASE 33 — Schema Drift Report

**Date:** 2026-10-25
**Verified drift: exactly 18 columns across 2 models** — the Phase 32 count is still accurate, confirmed column by column against `prisma/dev.db`.

Method: every scalar field in `prisma/schema.prisma` (213 models) compared to `PRAGMA table_info` for its `@@map` table. Relations excluded (they are not columns). Output:

```
models: 213 | models with drift: 2
  MessageAttachment (message_attachments): 8 columns
  ContentMedia      (content_media):      10 columns
```

No other model drifts — so the drift is confined to the two file tables touched by Phase 30 and Phase 32.

---

## 1. `ContentMedia` → `content_media` (10 columns)

| # | Column | Type / nullability / default | Security-sensitive | Backfill | Index / constraint | Code path that depends on it |
|---|---|---|---|---|---|---|
| 1 | `originalName` | TEXT, nullable, no default | No (display metadata; still sanitised on download) | No — legacy rows have no original name; NULL is correct | — | `saveContentMedia` (create), download `Content-Disposition` filename |
| 2 | `checksum` | TEXT, nullable | Yes — integrity metadata | No — cannot be computed for legacy bytes without reading every file; NULL means "unverified" | `content_media_checksum_idx` | `readContentMedia` verifies SHA-256 on read |
| 3 | `storageProvider` | TEXT, default `'local'` | No | Default covers existing rows | — | adapter selection in `readContentMedia` |
| 4 | `storageBucket` | TEXT, nullable | Yes — bucket name is infrastructure detail, never logged | No | — | S3 adapter only (unconfigured) |
| 5 | `accessLevel` | TEXT, default `'RESTRICTED'` | Yes — access policy | Default | — | `policies.ts`, download authorization |
| 6 | `processingStatus` | TEXT, default `'READY'` | No | Default | — | upload pipeline |
| 7 | `version` | INTEGER, **NOT NULL**, default `1` | No | Default | — | file versioning / `replacedById` |
| 8 | `replacedById` | TEXT, nullable | No | No | — | superseded-file chain |
| 9 | `organizationId` | TEXT, nullable, **FK → organizations ON DELETE SET NULL** | **Yes — tenant boundary** | Only where the uploader's own `organizationId` is known (conditional UPDATE); ambiguous rows stay NULL | `content_media_organizationId_idx` + FK | tenant check in `readContentMedia` |
| 10 | `updatedAt` | DATETIME, **NOT NULL** | No | **Yes** — filled from `createdAt` | — | Prisma `@updatedAt` on every write |

## 2. `MessageAttachment` → `message_attachments` (8 columns)

| # | Column | Type / nullability / default | Security-sensitive | Backfill | Index / constraint | Code path |
|---|---|---|---|---|---|---|
| 1 | `originalName` | TEXT, nullable | No | No | — | `readAttachment` filename |
| 2 | `checksum` | TEXT, nullable | Yes — integrity | No (same reasoning) | `message_attachments_checksum_idx` | checksum verify on read |
| 3 | `storageProvider` | TEXT, default `'local'` | No | Default | — | adapter selection |
| 4 | `storageBucket` | TEXT, nullable | Yes | No | — | S3 only |
| 5 | `accessLevel` | TEXT, default **`'PRIVATE'`** | Yes — private by default | Default | — | download authorization |
| 6 | `processingStatus` | TEXT, default `'READY'` | No | Default | — | upload pipeline |
| 7 | `version` | INTEGER, **NOT NULL**, default `1` | No | Default | — | versioning |
| 8 | `updatedAt` | DATETIME, **NOT NULL** | No | **Yes** — from `createdAt` | — | `@updatedAt` |

Note: attachments get `PRIVATE` while content media gets `RESTRICTED` — deliberate, and asserted by a test.

## 3. Two defects found while reconciling

### 3.1 The Phase 30 migration could not run on a non-empty table — **CRITICAL, silent**

`ALTER TABLE … ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` is accepted by SQLite **only while the table is empty**:

| rows present | result |
|---|---|
| 0 | accepted |
| 1 | `Cannot add a column with non-constant default` |

`prisma/dev.db` has **0** rows in `content_media` and `message_attachments`, which is the only reason the earlier "migration tested PASS" was ever true. On any database that actually holds files — i.e. every real deployment — this migration aborts. Repaired in the SQLite variant (add nullable → backfill from `createdAt` → enforce NOT NULL in the Phase 33 rebuild).

### 3.2 `ALTER TABLE` cannot create the tenant foreign key

The Phase 32 migration adds `content_media.organizationId` but SQLite's `ALTER TABLE` cannot add a `FOREIGN KEY`. Prisma's schema declares

```prisma
organizationId String?
organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
```

so the migrated database was missing a real integrity constraint and was reported as drifted by `migrate diff`. Fixed by the SQLite-only rebuild migration, which creates the constraint (`content_media_organizationId_fkey … ON DELETE SET NULL`) and normalises `updatedAt` to Prisma's `DATETIME`.

After the rebuild, `prisma migrate diff --from-url <migrated> --to-schema-datamodel prisma/schema.prisma --exit-code` returns **0** — zero drift.

## 4. Backfill policy (unchanged and re-verified)

- `organizationId` is filled **only** from `uploadedById → users.organizationId` when that value is non-null.
- Rows whose uploader has no organization are **left NULL** — never assigned to an arbitrary tenant.
- NULL-tenant rows remain protected at read time: since Phase 32, `readContentMedia` denies them when more than one organization exists (SUPER_ADMIN excepted, audited).
- Re-proven on a disposable copy: `reliable-owner.pdf` → backfilled to its uploader's org; `ambiguous-owner.pdf` → still `NULL`.
- No unrelated table, column, index or unique constraint was added. No uniqueness was invented for the new columns.

## 5. Not changed on purpose

- `Level.code`, `LearningGroup.name`, `LearningGroup.code`, `Course.code` remain globally unique (the multi-tenancy limitation reported in Phase 32). Changing a unique index on populated tables is a migration with its own blast radius and was out of scope for a drift repair.
- `Course`/`Lesson`/`Assessment`/`Assignment`/`ClassSession` still have no tenant column; their tenant remains derived. Adding it is a design change, not a reconciliation.
