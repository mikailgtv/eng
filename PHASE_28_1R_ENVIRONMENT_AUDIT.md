# PHASE 28.1R — Environment Audit

**Audit date:** 2026-10-07 (Asia/Tehran)  
**Scope:** Read-only discovery before project/database changes. No production target was contacted.

## Findings

| Area | Evidence | Result |
|---|---|---|
| Runtime / OS | Debian GNU/Linux 13; initial runtime Node.js 20.20.2, npm 10.8.2, Corepack 0.34.6 | Repository requires Node `>=22.13.0 <23.0.0`; `.nvmrc` target was 22.23.3. Tests used isolated Node 22.23.3 via npm, without changing project runtime files. |
| Package manager | `package.json` declares `npm@10.8.2`; pnpm/yarn/bun unavailable | `npm ci --ignore-scripts` installed 232 packages for testing; lockfile was not intentionally changed. |
| Hosting | No active Netlify runtime indicator; repository includes `netlify-demo/netlify.toml` and a demo service worker | This is sample/demo configuration, not evidence of the actual production host. Actual hosting provider remains unknown. |
| Environment configuration | `.env` contains a configured `DATABASE_URL` with SQLite/file scheme; `SESSION_SECRET` is configured. PostgreSQL/provider/storage variable names checked without printing values. | No PostgreSQL URL/host, hosted provider endpoint, or external backup-storage configuration was found. Secret values were never printed or included in reports. |
| Initial database tooling | Docker, Podman, PostgreSQL server/client tools, SQLite CLI, and local Prisma CLI were initially absent | Python SQLite 3.46.1 was available and used for read-only inspection and SQLite Online Backup API. PostgreSQL was subsequently installed for the expressly authorized disposable rehearsal. |
| PostgreSQL install feasibility | Debian apt candidate for PostgreSQL 17 was available; passwordless administrative installation was available; service auto-start policy denied starts | PostgreSQL 17.11 was installed, a separate temporary cluster was used, then its data directory/database were removed. No cluster remains. |
| Filesystems | `/home/user` is writable ext4; `/tmp` is writable tmpfs (about 972 MB available at inspection); `/var/tmp` is writable ext4; `/mnt` and `/media` are not writable | `/tmp` was adequate for isolated temporary validation, but is ephemeral and is not a persistent backup destination. |
| Repository metadata | Git executable exists; `/home/user/.git` absent | No repository diff/commit could be produced. No credentials were committed. |

## Source and existing artifacts

- SQLite source: `/home/user/prisma/dev.db`, opened using SQLite URI `mode=ro` and `PRAGMA query_only=ON` for all source reads.
- Source SHA-256 before and after testing: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`; size 4,517,888 bytes.
- Existing local backup artifacts remain inside the repository/workspace and do not establish persistent off-host backup readiness. They were not re-audited in this phase.
- Main schema initially used SQLite and remains unchanged. It had no Prisma migration directory at the start of this phase.

## Conclusion

A local PostgreSQL rehearsal was feasible and completed. A durable external backup destination and a production PostgreSQL target are still unconfigured. This audit does **not** establish the production hosting provider, production credentials, production backup readiness, or permission to access a production database.
