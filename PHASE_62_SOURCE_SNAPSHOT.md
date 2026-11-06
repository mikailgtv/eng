# Phase 62 — Source Snapshot (Reproducible Manifest)

**Date:** 2026-10-26T22:02Z  
**Host:** Gravelines FR, 1.9Gi RAM 0B swap 2 CPU, Node v20.20.2 (mismatch), no git repo

## 1. Source revision (no git)

Repository has **no `.git` directory** (`ls -la .git` → not found, `git status` → not a git repository). Previous phases preserved work as file snapshots, not commits. Source snapshot is therefore a **file-hash manifest** of all release-critical paths.

**Relevant file hashes (SHA-256, current working tree):**

| Path | SHA-256 | Note |
|---|---|---|
| `prisma/dev.db` | `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` | original, read-only, verified before/after |
| `package-lock.json` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | no deps added |
| `prisma/migrations/20261026000000_phase57_daily_goals/migration.sql` | `d4b9b6b43710f48e9885993ecd4aaa5ba4c14881d1cbb231fdf4c5bebfb1b6ab` | 3 ALTERs, minimal |
| `prisma/migrations/20261001000000_sqlite_baseline/migration.sql` | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` (header) | baseline, marked applied via resolve, never executed |
| `prisma/migrations/20261010000000_phase30_storage_metadata/migration.sql` | `fa484a84…` (PostgreSQL source `fa484a84f5f7cd821894a2d94e58f8010902573d71fd663df707fdc52f14fc1a`) | storage metadata, phase33 variant |
| `prisma/migrations/20261010000001_phase32_tenant_isolation/migration.sql` | `0c788338…` | tenant isolation, `organizationId` |
| `prisma/migrations/20261010000002_phase33_sqlite_file_integrity/migration.sql` | (rebuild, no hash header) | SQLite rebuild for FK/updatedAt |
| `prisma/schema.prisma` | (contains `StudentLearningPreference dailyGoalType/Value/Enabled`) | `provider sqlite` |
| `package.json` version `0.1.0`, Next `15.5.27` | `engines node >=22.13.0 <23.0.0` | matches `.nvmrc 22.23.3` |
| `next.config.mjs` | `experimental.cpus:1`, `allowedDevOrigins *.e2b.app` | memory-heavy build predictable |
| `tsconfig.json` | `strict true`, `incremental true`, `noEmit true` | |
| `src/components/vocab/review-session.tsx` | `const lastUpcoming: number \| null = null` | Phase 60 lint fix `let→const` preserved |
| All `PHASE_60_*` + `PHASE_61_*` reports | preserved, not overwritten | |
| `evidence/p59/*.png` | 4 synthetic fallback 23–30 KiB decodable | historical, labeled synthetic |
| `evidence/p60/evidence-manifest.json` | 4 BLOCKED entries | |
| `evidence/p61/evidence-manifest.json` | 4 BLOCKED entries | |

**How snapshot was generated:**
```bash
sha256sum prisma/dev.db package-lock.json prisma/migrations/20261026000000_phase57_daily_goals/migration.sql
cat .nvmrc; cat package.json | grep engines; npx next --version; npx prisma --version
ls prisma/migrations/; cat prisma/schema.prisma | grep -A2 dailyGoal
# All commands recorded in PHASE_61_BASELINE.md and re-verified here
```

## 2. Runtime versions
- **Node:** `v20.20.2` (host), **required:** `22.23.3` (`.nvmrc` + `engines >=22.13.0 <23.0.0`) → mismatch, no `nvm`/`fnm`/`volta` available, `/opt/node*` missing, no `node22` binary
- **npm:** `10.8.2`
- **Next.js:** `15.5.27`
- **Prisma:** `5.22.0` (CLI+client, `debian-openssl-3.0.x`, `linux` x64)
- **OS:** `linux` `x64`, `debian-openssl-3.0.x` (Prisma binaryTarget)
- **Lockfile:** `package-lock.json 035df9a…` (no drift)

## 3. .nvmrc consistency
- `.nvmrc 22.23.3` **consistent** with `package.json engines >=22.13.0 <23.0.0` (22.23.3 satisfies). Host `v20.20.2` does not satisfy, but Next 15.5.27 runs on 20 (requires >=18.17). Recommendation: use `22.23.3` on compatible runner; do not modify `.nvmrc`.

## 4. Excluded from package
- **Not included:** `prisma/dev.db` production data (only hash), `.env` secrets, `/tmp/p60/p60-staging.db` synthetic data, `.next/` build artifacts, `node_modules/`, `evidence/p59/*.png` synthetic (kept as historical but not needed for runner), any `.env.local`
- **Included:** All `src/`, `prisma/schema.prisma`, `prisma/migrations/`, `package.json`, `package-lock.json`, `.nvmrc`, `next.config.mjs`, `tsconfig.json`, `scripts/` harnesses, `PHASE_6*` reports

## 5. Preservation
- All Phase 60/61 work preserved (reports, evidence). No `git reset`/`discard`/`rewrite` performed (no git). No original DB copied to external runner (only disposable staging clones to `/tmp` with synthetic users).

## 6. Reproducibility instructions
```bash
# On compatible runner (Node 22.23.3, 4 GiB RAM):
git clone <repo-url>  # or restore from provided archive with same file hashes above
nvm use 22.23.3  # or volta pin node@22.23.3, verify node -v → v22.23.3
npm ci  # must keep lockfile 035df9a… unchanged, 232 packages
sha256sum prisma/dev.db  # must be 68a00e… before any test
# Follow PHASE_62_RUNNER_HANDOFF.md for build/browser/prisma steps
```

No database, credential, env file, or generated user data included in this snapshot.

