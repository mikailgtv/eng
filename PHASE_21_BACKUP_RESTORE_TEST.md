# Phase 21 — Backup & Restore Test

**Audit date:** 2026-10-05
**Result:** **Local SQLite snapshot and temporary file-level restore passed. Full staging recovery simulation not run.** Do not interpret this as a verified production backup system.

## Snapshot identity

- Source DB: `/home/user/prisma/dev.db` (`DATABASE_URL=file:./dev.db`, resolved relative to `prisma/schema.prisma`).
- Snapshot: `backups/phase20-local-dev-db-post-change-20261005.sqlite` (local file, mode `0600`, ignored by Git).
- Snapshot size: 4,517,888 bytes.
- Snapshot SHA-256: `1b161f81e8cf7458dac9860ddfbd71dc99bf462ce5d7ad9538a7a91b20a1ec71`.
- Source DB SHA-256 at audit: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`.
- Snapshot scope: SQLite DB contents only. It contains the **post-change** state after Phase 20 seed/schema/QA writes; it is not a pre-incident recovery point. It is not encrypted. Do not upload/commit it or send it to an external service.

## Tests completed

1. Used Python's SQLite online backup API to create a snapshot from a read-only connection.
2. Reopened the snapshot read-only; `PRAGMA integrity_check` returned `ok`; `PRAGMA foreign_key_check` returned zero violations.
3. Created a temporary SQLite copy from the snapshot with `scripts/ops/verify-sqlite-backup.py`.
4. Rechecked integrity/FKs and compared 213-table inventory plus selected row counts (users, organizations, groups, levels, courses, books, lessons, profiles, XP). The restore script printed `ok: true` and deletes its temporary directory on exit.
5. Selected counts in the restored copy matched: users 87, organizations 1, groups 5, levels 7, courses 4, books 1, lessons 39, profiles 77, XP transactions 23.

6. After installing dependencies, generated Prisma Client and built the current app, reran the restore harness with `--prisma --app-health`: Prisma readback matched users 87, courses 4, lessons 39 and lesson-progress rows 5; a temporary Next.js production server connected only to the restored copy and returned HTTP 200 `{"status":"healthy"}` from `/health`. An unauthenticated `/api/books` request returned 401 with `HTTP_401` and an `x-request-id`. The script terminated the server and deleted the temporary DB directory on exit.

No Netlify app was started against the restored DB. This was a local app recovery simulation, not the requested staging recovery simulation or a test of authentication/teacher/student/exam/certificate workflows.

## Restore procedure

For local test-only verification (never point at production):

```bash
python3 scripts/ops/verify-sqlite-backup.py backups/phase20-local-dev-db-post-change-20261005.sqlite
# With dependencies installed and a current Next build:
python3 scripts/ops/verify-sqlite-backup.py backups/phase20-local-dev-db-post-change-20261005.sqlite --prisma --app-health
```

For an operational recovery after an incident:

1. Freeze writes and record environment/deploy IDs; do not overwrite the damaged database.
2. Confirm which backup belongs to that environment and verify its hash/retention timestamp.
3. Restore into an isolated temporary database/storage namespace; never overwrite source first.
4. Run schema/migration compatibility checks and row-count/business-invariant checks.
5. Start the exact application build against the temporary target; check public health, authorized admin/teacher/student workflows, progress, exam and certificate reads.
6. Obtain owner approval, switch the environment connection, observe traffic/metrics, then retain the damaged source and backup until the recovery window expires.
7. Delete temporary data only after documenting the test result and retaining logs without secrets.

## Gaps / policy

- No automated daily backup, off-site replication, encryption key management, retention/expiry automation or alerting was found.
- The local snapshot is an offline recovery artifact, not a secure managed backup product.
- The old `prisma/dev.db.phase20.bak` has not been restored or compared and is not assumed trustworthy.
- No full staging restore test, Netlify deployment, storage restore or mobile/client verification was run.
- Proposed policy for the future managed staging/production DB: encrypted daily backups retained 7 days, weekly retained 4 weeks, monthly retained 6 months; off-site and access-controlled; verify each backup automatically and restore-test monthly. Object storage must use versioning/retention and independent backups. These are recommendations, not current guarantees.
- Keep the decryption key in a separate secrets manager with dual-control recovery; do not store it beside the backup.
