# DEPLOYMENT_GUIDE — GitHub vs Actions vs Real Website

> **Beginner clarity:** Storing code on GitHub is **not** the same as having a live website. GitHub Actions is **not** hosting your app. This guide explains each step and what actually works for this Next.js + SQLite project.

---

## 1. Three Different Things

| Action | What it does | What it does NOT do |
|--------|--------------|---------------------|
| **Store on GitHub (Private)** | Your source code lives safely on github.com, you can download it anywhere, share with team via invite | **Does NOT** make it a website visitors can open |
| **Run GitHub Actions** | GitHub's cloud computer (`ubuntu-24.04`) does `npm ci` → `prisma generate` → lint → `next build` → 4 browser screenshots to prove it works | **Does NOT** deploy — it builds in a temporary machine that is deleted afterwards |
| **Deploy website** | Your built app runs 24/7 on a hosting provider (Vercel, Netlify, etc.) with a real URL like `https://englishbridge.example.com` | Requires separate choice — GitHub upload alone is insufficient |

**Analogy:** GitHub = safe drawer for blueprints; Actions = test-build in factory; Deploy = actually constructing building people enter.

---

## 2. Supported Deployment Options for This Project (Verified Compatibility)

> Do not promise deployment works until verified. Here is verified reality for **Next.js 15 + Prisma 5.22.0 + SQLite** as built.

### Option A — Vercel (Next.js native, partially limited)

- **Why considered:** Made by Next.js team, auto-detects `next.config.mjs`, runs `next build` exactly like GitHub Actions.
- **SQLite limitation — IMPORTANT:** Vercel's filesystem is **ephemeral** (resets on every deploy/scale). SQLite file `prisma/dev.db` would be **wiped** on each invocation — user data lost. Vercel docs recommend switching to hosted Postgres (Vercel Postgres, Neon, Supabase).
- **Verdict:** **NOT recommended as-is** for production with SQLite. Requires migration to PostgreSQL: change `provider = "postgresql"` in `prisma/schema.prisma` + `DATABASE_URL=postgresql://...` + move `prisma/migrations.postgresql/` to `prisma/migrations/` via `node scripts/db/restore-postgresql-migrations.mjs` (included). `prisma/schema.postgresql.prisma` is provided as template. Without this, demo only.

### Option B — Netlify (also Next.js, same SQLite caveat)

- **Why considered:** `EnglishBridge_Netlify_Demo.zip` in repo is history — Netlify was demo target.
- **SQLite limitation:** Same ephemeral filesystem — SQLite not persistent on Netlify Functions/Edge. Requires external DB or switch to Postgres as above.
- **Verdict:** **NOT recommended as-is** with SQLite. Use only after Postgres migration.

### Option C — Traditional VPS / Private Server (SQLite works, but you have none)

- **How:** You stated “user has no personal server” — so not currently available.
- **If you later get a server (e.g., Ubuntu VPS):** SQLite **is** persistent on a regular disk, so this project would deploy directly with `npm run build && npm start` (PM2/systemd). But **do not purchase** until needed — GitHub Actions verifies build without server.
- **Verdict:** Would work with SQLite, but **out of scope** today (no server to provision per Phase 64 requirements).

### Option D — Keep as Private GitHub + Actions Only (Current Supported Path)

- **What you have:** Sanitized `englishbridge-lms-github.zip` → Private GitHub repo → manual `workflow_dispatch` `phase63-release-verification.yml` proves build on `ubuntu-24.04` (7 GB RAM, Node 22.23.3).
- **Result:** You can prove code is healthy, share with team, keep history — **without** public deployment or paid runner. Screenshots `evidence/p63/*.png` (1280×900 etc.) are built and downloadable as artifact `phase63-evidence` (14-day retention).
- **Verdict:** **Supported today** — no extra cost beyond free private-repo minutes (2000 Ubuntu min/month free).

---

## 3. What You Should Do Now (Beginner Path)

1. **Today:** Upload to **Private GitHub** using `GITHUB_BEGINNER_GUIDE.md` Option A (website drag-and-drop). Run **Actions → Run workflow** to verify build passes.
2. **Next week:** If you need a live URL, choose Postgres migration first (ask for Phase 66 PostgreSQL path — do not deploy SQLite to Vercel/Netlify as production).
3. **Never:** `npm run db:seed` on production (seed refuses unless `ALLOW_DEMO_SEED=true`), commit `.env`, or enable public repo before security audit.

---

## 4. Limitations & Honest Checks

| Check | Verified? |
|-------|-----------|
| Local `next build` on 8 GB Windows | **Inferred** — should pass (needs 4 GB+, your 8 GB OK), but not tested on your machine until you run `npm ci && npm run build` |
| GitHub Actions build on `ubuntu-24.04` | **Verified configuration** (`phase63-release-verification.yml` manual trigger, least-privilege, 30-min timeout) but **not yet hosted** — requires your first manual run to prove |
| Browser screenshots 4× | **Verified locally** via `scripts/p60-harness.mjs` on disposable `/tmp/*.db` (previous phases), but **not via hosted** until you run Actions |
| Vercel/Netlify SQLite persistence | **Verified incompatible** — ephemeral FS, Postgres required (documented in this guide, not promised) |
| Secrets in package | **Verified safe** — `.env.example` only placeholders (`replace-with-64-hex...`), source grep `sk-proj|ghp_|AKIA` → none, `prisma/dev.db` excluded |

**Stop after upload + Actions verification — do not start another dev phase until asked.**

