# PHASE 28.1R — Security Report

**Date:** 2026-10-07 (Asia/Tehran)

## Controls observed

- SQLite source was accessed read-only for all validation/import reads; its SHA-256, size, and modification time remained unchanged.
- Temporary SQLite backup/restore files were created with mode `0600`; temporary PostgreSQL data was owned by the PostgreSQL system user with directory mode `0700`.
- PostgreSQL rehearsal accepted connections only on loopback `127.0.0.1` at a non-default port. The temporary cluster used trust authentication/no TLS only inside this isolated, disposable sandbox. It was not exposed or treated as production security configuration.
- Temporary backup, restore, import CSVs/scripts, and PostgreSQL cluster/data were stopped and deleted after verification. No persistent copy of the imported source data was left by this phase.
- Environment values, credentials, URLs, tokens, hashes of secrets, and database row values were not disclosed. Reports state configuration presence/classification only. The application checks used synthetic session configuration.
- No production or `UNKNOWN` database target was contacted. No `db push` was used. No credentials were added to migration files.
- The workspace has no `.git` metadata, so no commit was made.

## Residual risks / external gates

1. A persistent, independently managed backup destination, retention policy, and tested production recovery process are not configured or validated.
2. No production PostgreSQL endpoint/provider has been configured; a local disposable cluster is not a substitute.
3. Authenticated login/logout and admin operations were not tested because no approved test account/credentials were supplied. Production TLS, role separation, network ACLs, monitoring, and provider-specific backup guarantees were not tested.
4. The PostgreSQL migration schema is a candidate alongside the existing SQLite default. Deployment/build configuration must explicitly select the PostgreSQL schema before a future production cutover.

**Security conclusion:** safe for the completed isolated technical rehearsal only; not production-ready and not authorization to access or migrate production.
