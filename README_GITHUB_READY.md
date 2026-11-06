# EnglishBridge LMS — Learning Management System

A professional, beginner-friendly English Learning Management System for organizational training. Learners are organized as **groups inside one centralized platform** (not separate systems) — for example, Firefighter Shifts A–D and Day Workers.

- **Student experience:** Dashboard, My Learning (course → module → lesson), vocabulary & grammar, practice activities (10 types), real progress calculation, vocabulary review, practice scores
- **Teacher & Admin:** Group management, user management, course assignment, progress insights
- **Tech:** Next.js 15 (App Router) + TypeScript + Prisma ORM + SQLite (dev) → switch to PostgreSQL for production by changing `provider` and `DATABASE_URL`

> This package is **GitHub-ready and sanitized**: it contains source code and config only — no real database, no secrets, no `node_modules`, no build output. See `PACKAGE_MANIFEST.txt` for full list.

---

## Prerequisites

| Requirement | Version | How to check |
|-------------|---------|--------------|
| Node.js | **22.23.3** exact (`.nvmrc`) | `node --version` → should be `v22.23.3` |
| npm | 10.8.2+ | `npm --version` |
| Git | any recent | `git --version` |

**Install Node 22.23.3:**
- Windows/macOS: download from https://nodejs.org/ → install → run `nvm use 22.23.3` if using nvm, or `volta pin node@22.23.3` if using Volta
- Verify: `node --version` must be `v22.23.3` (required by `package.json` engines `>=22.13.0 <23.0.0`)

Disk: ~500 MB free (source + `npm ci` + build). RAM: 4 GB+ recommended for `next build` (1.9 GB fails with SIGKILL — use GitHub Actions).

---

## Installation (Windows, macOS, Linux — same)

```bash
# 1. Extract ZIP
# On Windows: right-click englishbridge-lms-github.zip → Extract All → choose folder like C:\Projects\
# You will get C:\Projects\englishbridge-lms\

# 2. Open terminal in that folder
cd C:\Projects\englishbridge-lms   # or your extract path

# 3. Install dependencies (reproducible, uses lockfile)
npm ci
# This also runs `prisma generate` (postinstall) to create Prisma Client

# 4. Verify install
npx prisma --version   # should be 5.22.0
npm run typecheck      # should be 0 errors
```

**Do not use `npm install` instead of `npm ci`** — `npm ci` guarantees exact versions from `package-lock.json`.

---

## Environment Configuration

1. **Copy the safe template:**
   ```bash
   copy .env.example .env.local   # Windows
   cp .env.example .env.local     # macOS/Linux
   ```

2. **Edit `.env.local` (never commit real `.env`):**

   ```ini
   # Must point to a disposable file — NEVER prisma/dev.db directly
   DATABASE_URL=file:./phase21-sandbox.db
   PHASE21_SANDBOX_CONFIRM=YES

   SESSION_SECRET=replace-with-64-hex-characters-from-openssl-rand-hex-32
   # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Then paste that 64-char hex string above

   PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_DEMO_HINTS=false
   ```

3. **Rules:**
   - `.env.example` contains **only placeholders** (`replace-with-...`) — safe to commit.
   - Real `.env` / `.env.local` are **gitignored** (`.gitignore` line `.env`) — never uploaded to GitHub.
   - Never reuse the same `SESSION_SECRET` between dev / staging / production.

See `.env.example` for full comments on `STORAGE_PROVIDER`, `AI_API_KEY`, etc. (all optional, leave blank to use fallbacks).

---

## Database Setup (Disposable — never touches original `prisma/dev.db`)

The package contains **no database file** (sanitized for GitHub). You create a fresh one locally:

```bash
# 1. Create empty disposable file & apply migrations
mkdir -p prisma
: > prisma/phase21-sandbox.db   # or manually create empty file
DATABASE_URL=file:./phase21-sandbox.db npx prisma migrate deploy
# Applies 5 migrations: sqlite_baseline + phase30 + phase32 + phase33 + phase57 daily_goals

# 2. Seed base curriculum (7 levels, 5 groups, courses, 25 lessons, activities)
DATABASE_URL=file:./phase21-sandbox.db PHASE21_SANDBOX_CONFIRM=YES npx tsx prisma/seed.ts
# Output: ✓ 7 levels ✓ 5 groups ✓ admin/teacher ✓ 65 activities etc.

# Optional: add disposable test users for progress/dashboard testing
DATABASE_URL=file:./phase21-sandbox.db npx tsx scripts/setup-p58-staging.ts
# Creates p58.alice / p58.bob (synthetic, for verification only)
```

**Safety:** `prisma/dev.db` is gitignored and not in ZIP. `scripts/db/guarded-migrate.mjs` refuses to run against it. All writes go to `phase21-sandbox.db` or `/tmp/*.db` — never original.

To verify DB: `npx prisma studio` (opens browser at localhost:5555).

---

## Running Locally

```bash
npm run dev        # http://localhost:3000 (development, hot reload)
```

**Production preview (same as GitHub Actions):**
```bash
npm run build      # prisma generate + next build → creates .next/BUILD_ID
npm start          # http://localhost:3000 (needs DATABASE_URL set)
```

Login with demo accounts (created by `seed.ts`, **dev only** — never seed production):
- Admin: `admin` / `Admin#Demo1`
- Teacher: `sara.whitfield` / `Teacher#Demo1`
- Student: `james.carter` / `Student#Demo1`

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + production build |
| `npm start` | Production server (needs `DATABASE_URL`) |
| `npm run lint` | `eslint src` (0 errors expected) |
| `npm run typecheck` | `tsc --noEmit` (0 errors expected) |
| `npm run db:seed` | Seed to `phase21-sandbox.db` (requires `PHASE21_SANDBOX_CONFIRM=YES`) |

Tests: `npx tsx scripts/test-phase57-progress.ts` etc. (6 suites, all use disposable `/tmp` DBs).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Node 22.23.3 required` / `EBADENGINE` | Install Node 22.23.3 exactly (`nvm use 22.23.3`), then `rm -rf node_modules && npm ci` |
| `prisma migrate deploy` fails on empty DB | Ensure file exists: `: > prisma/phase21-sandbox.db` before deploy |
| `Seed refuses` `phase21-sandbox.db is allowlisted` | Set `DATABASE_URL=file:./phase21-sandbox.db` **and** `PHASE21_SANDBOX_CONFIRM=YES` |
| `next build` SIGKILL / out of memory | Local 1.9 GB RAM insufficient — use GitHub Actions `ubuntu-24.04` (7 GB) via `.github/workflows/phase63-release-verification.yml` |
| `SESSION_SECRET` error | Must be ≥32 chars, generate fresh `openssl rand -hex 32` |
| Port 3000 in use | `lsof -i :3000` → kill, or `npm run dev -- -p 3001` |

Still stuck? Open an Issue on GitHub with logs (never paste secrets — see `PACKAGE_MANIFEST.txt`).

---

## Project Structure

```
src/           Next.js app (app/, components/, lib/, middleware.ts)
public/        Static assets (audio, images, manifest)
prisma/        schema.prisma, migrations/, curriculum/, seed files
scripts/       Test suites + staging helpers (setup-p58, guarded-migrate)
.github/       GitHub Actions workflow (phase63-release-verification.yml)
package.json   Scripts + engines (Node >=22.13.0)
```

Original `prisma/dev.db` not included — see `GITHUB_BEGINNER_GUIDE.md` for upload.

---

## License & Safety

Private project — source hygiene verified 2026-10-27: `.gitignore` excludes `prisma/dev.db`, `.env`, `node_modules/`, `.next/`, `evidence/`, `*.pem` etc. (see `svgPHASE_64_2_SOURCE_HYGIENE.md` in original workspace).

