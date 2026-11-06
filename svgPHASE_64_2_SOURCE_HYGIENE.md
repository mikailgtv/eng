# svgPHASE_64.2_SOURCE_HYGIENE — Evidence Exclusions & Staging Safety (Final)

**Date:** 2026-10-27T03:42Z — Phase 64.2 §1-2 audit
**Host:** `1.9Gi 0B swap 2CPU` `Node v20.20.2` → runner `22.23.3` (verified via `cat .nvmrc`) `Prisma 5.22.0`
**File inspected:** `.gitignore` exact via `cat -A` + `nl -ba` 2026-10-27T03:42Z
**Hashes before:** `prisma/dev.db 68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` `package-lock.json 035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`
**Hashes after:** identical — **unchanged** (recalculated `sha256sum` after fix)
**Temp test:** disposable `/tmp/phase642-verify` (never real DB, never secrets) — deleted after

---

## 1. Correct and Verify Evidence Exclusions

### 1A. Inspect Actual `.gitignore`

**Command:** `cat -A .gitignore` + `nl -ba .gitignore` 2026-10-27T03:42Z

**Before fix (2026-10-27T03:40Z):**
- Lines 38-42: `evidence/p60/` `evidence/p61/` `evidence/p62/` `evidence/p63/` `evidence/p64/` — **missing `evidence/p59/` and generic rule**
- Discrepancy: prior report `svgPHASE_64_1_SOURCE_HYGIENE.md` claimed `evidence/p59/` PASS but table only tested `evidence/p63/` via `git check-ignore evidence/p63/dummy.png` — `evidence/p59/dummy.png` would be **NOT IGNORED**.

**Evidence:** Temp test 2026-10-27T03:40Z:
```bash
mkdir -p /tmp/phase642-test && cp .gitignore /tmp/phase642-test/ && cd /tmp/phase642-test && git init -q
mkdir -p evidence/p59 evidence/p63 && touch evidence/p59/dummy.png evidence/p63/dummy.png
git check-ignore -v evidence/p59/dummy.png
# Result: (no output) NOT IGNORED - BUG
git check-ignore -v evidence/p63/dummy.png
# Result: .gitignore:41:evidence/p63/  evidence/p63/dummy.png — IGNORED
```

### 1B. Fix Applied (minimal, preserves existing rules)

**Change:** Replace 5 specific lines with single generic `evidence/` (covers p59..p64 + future p65..)
- Command: `python3 /tmp/fix_gitignore.py` — replaced block `evidence/p60/\n...p64/` with `evidence/`
- File: `.gitignore` line 38 now `evidence/` (verified `cat -A` 2026-10-27T03:42Z)
- Preserved: all other 41 lines (`node_modules/` `.next/` `prisma/dev.db` etc.) unchanged — `grep -Count "prisma/dev.db" .gitignore` = 4 before and after

**After fix content (verified `cat .gitignore`):**
```
evidence/
test-results/
playwright-report/
.playwright/
coverage/
```

### 1C. Verify Each Sensitive/Generated Path with `git check-ignore -v`

**Commands (disposable `/tmp/phase642-verify`, no real DB):**
```bash
rm -rf /tmp/phase642-verify && mkdir -p /tmp/phase642-verify
cp /home/user/.gitignore /tmp/phase642-verify/ && cd /tmp/phase642-verify && git init -q
mkdir -p evidence/p59 evidence/p63 prisma node_modules .next
touch evidence/p59/dummy.png evidence/p63/dummy.png
touch prisma/dev.db prisma/dev.db-wal prisma/dev.db-journal prisma/dev.db-shm
touch prisma/dev.db.phase20.bak .env .env.local node_modules/foo.js .next/cache.bin secret.pem private.key token123.txt credentials.json
git check-ignore -v <each-file>
```

**Results (2026-10-27T03:42Z):**

| Path | `git check-ignore -v` Output | Verdict |
|------|------------------------------|---------|
| `evidence/p59/dummy.png` | `.gitignore:38:evidence/  evidence/p59/dummy.png` | **VERIFIED PASS** (was BUG, now fixed) |
| `evidence/p63/dummy.png` | `.gitignore:38:evidence/  evidence/p63/dummy.png` | **VERIFIED PASS** |
| `prisma/dev.db` | `.gitignore:22:*.db  prisma/dev.db` | **VERIFIED PASS** |
| `prisma/dev.db-wal` | `.gitignore:24:*.db-wal  prisma/dev.db-wal` | **VERIFIED PASS** |
| `prisma/dev.db-journal` | `.gitignore:23:*.db-journal` | VERIFIED PASS (via `git status`) |
| `prisma/dev.db-shm` | `.gitignore:25:*.db-shm` | VERIFIED PASS |
| `.env` | `.gitignore:5:.env  .env` | **VERIFIED PASS** |
| `.env.local` | `.gitignore:9:.env*.local` | VERIFIED PASS |
| `node_modules/foo.js` | `.gitignore:1:node_modules/  node_modules/foo.js` | **VERIFIED PASS** |
| `.next/cache.bin` | `.gitignore:2:.next/  .next/cache.bin` | VERIFIED PASS |
| `secret.pem` | `.gitignore:31:*.pem  secret.pem` | VERIFIED PASS |
| `private.key` | `.gitignore:32:*.key  private.key` | VERIFIED PASS |
| `token123.txt` | `.gitignore:35:*token*  token123.txt` | VERIFIED PASS |
| `credentials.json` | `.gitignore:36:*credentials*` | VERIFIED PASS |

**Safe files can still be staged (verified):**
```bash
touch prisma/schema.prisma prisma/migrations/20261001000000_sqlite_baseline/migration.sql prisma/migrations/migration_lock.toml
git check-ignore -v prisma/schema.prisma
# Result: (no output) NOT IGNORED — PASS (can be staged)
git check-ignore -v prisma/migrations/20261001000000_sqlite_baseline/migration.sql
# Result: NOT IGNORED — PASS
```
- `prisma/schema.prisma` 153KiB **NOT IGNORED**
- `prisma/migrations/*/migration.sql` **NOT IGNORED**
- `prisma/migrations/migration_lock.toml` **NOT IGNORED**

**Full `git status --short --ignored` (disposable):**
```
?? .gitignore
?? prisma/
!! .env
!! .env.local
!! .next/
!! credentials.json
!! evidence/
!! node_modules/
!! prisma/dev.db
!! prisma/dev.db-journal
!! prisma/dev.db-shm
!! prisma/dev.db-wal
!! prisma/dev.db.phase20.bak
!! private.key
!! secret.pem
!! token123.txt
```
- Count `!!` = 14 ignored (all sensitive/generated correctly flagged, no safe `prisma/schema.prisma` in `!!`)

**Never copied real secrets/DB:** temp repo used `touch` to create 0-byte dummies (`ls -lh prisma/dev.db` 0 bytes, not `68a00e…`), no `cat .env` content printed.

---

## 2. Audit Exact Future Staging Set

**Proposed staging list (from workflow docs + hygiene report):**
```
package.json (4.0K) — EXISTS PASS (verified ls -lh)
package-lock.json (152K, 035df9a…) — EXISTS PASS
.nvmrc (22.23.3) — EXISTS PASS
next.config.mjs (2.0K) — EXISTS PASS
tsconfig.json (4.0K) — EXISTS PASS
src/ (3.8M) — EXISTS PASS
prisma/schema.prisma (153K) — EXISTS PASS
prisma/migrations/ (5 dirs, 20 bytes lock) — EXISTS PASS
public/ (2.1M) — EXISTS PASS
scripts/ (904K) — EXISTS PASS
.github/ (15K workflow) — EXISTS PASS
.gitignore (588B, now 528B after fix) — EXISTS PASS
.env.example (4.9K placeholder) — EXISTS PASS
```

**Check every path:** `while read f; do [ -e "$f" ] && echo EXISTS || echo MISSING; done < /tmp/proposed_list.txt` → all **EXISTS PASS** (2026-10-27T03:42Z)

**Search for tracked/potentially staged env files, DBs, backups, credentials, artifacts:**
- Proposed includes ` .env`? `grep -c "^\.env$" /tmp/proposed_list.txt` → **0** (correct, only ` .env.example` safe template with `SESSION_SECRET=replace-with-64-hex…`)
- Proposed includes `dev.db`? `grep -c "dev.db" /tmp/proposed_list.txt` → **0**
- Credentials in proposed `src/lib/auth.ts` `src/lib/server-env.ts` → contain `SESSION_SECRET` validation logic, not values (checked `grep SESSION_SECRET src/lib/auth.ts` shows `if (!secret) throw` — no secret value)
- Backups `prisma/*.bak` — `ls prisma/*.bak` shows `prisma/dev.db.phase20.bak` 4.3MiB but **NOT** in proposed list and gitignored (`prisma/*.bak`)
- Generated artifacts `evidence/` `.next/` `node_modules/` `backups/` — all gitignored, not proposed

**`prisma/migrations.postgresql/` required? — Explicit evidence:**

- Command: `ls -la prisma/migrations.postgresql/` → 3 migrations `20261007183000_postgresql_baseline` etc. + `MANIFEST.sha256` + `README.md`
- `cat prisma/migrations.postgresql/README.md`:
  > “PostgreSQL migration history (preserved, not applied) … NOT applied to SQLite dev DB … Prisma never reads this directory … Restore with `node scripts/db/restore-postgresql-migrations.mjs`”
- `cat prisma/migrations/migration_lock.toml` → `provider = "sqlite"` vs `prisma/migrations.postgresql/migration_lock.toml` → `provider = "postgresql"`
- `cat prisma/schema.prisma | grep provider` → `provider = "sqlite"` (live)
- `grep -n "migrations.postgresql" .github/workflows/phase63-release-verification.yml` → **0 matches** (workflow never references it)
- Workflow `DATABASE_URL: file:/tmp/p63/p63-staging.db` + `provider sqlite` → SQLite only

**VERIFIED:** `prisma/migrations.postgresql/` is **NOT required** by workflow — workflow uses SQLite `prisma/migrations/` only. Including it would add 8.5K preserved history but not affect SQLite build; excluding is safe. Do not guess — evidence shows no dependency.

**`git status --short --ignored` in disposable (verified no staged leak):** see §1C — `!! evidence/` `!! prisma/dev.db` `!! .env` correctly ignored, `?? prisma/` indicates safe `schema.prisma`/`migrations/` inside would be staged via explicit `git add prisma/schema.prisma prisma/migrations/` (not whole dir).

---

## 3. Hashes & Safety Invariants

- **Do not initialize real repo:** `cd /home/user && git status` → `not a git repository` (verified before/after)
- **Do not push/remote:** no `git remote` created
- **Do not modify `.env` `package-lock.json` `prisma/migrations` `prisma/dev.db`:** hashes recalculated `sha256sum prisma/dev.db package-lock.json` before `68a00e… 035df9a…` after `68a00e… 035df9a…` — **unchanged**
- **Do not print secrets:** only `evidence/p59/dummy.png` dummies, no `cat .env` values

**Verdict for hygiene:** **PASS** — all evidence exclusions now correct (generic `evidence/`), staging set safe, `migrations.postgresql` not required, no secret exposure.

