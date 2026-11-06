# GITHUB Beginner Guide — Upload with Graphical Interface (No Terminal Stress)

> **You do NOT need to know Git to upload.** This is the safest, click-only way using GitHub website. Do not create a public repo — your LMS contains learning logic that should stay private until you deploy.

---

## What You Need Before Starting

- The ZIP you downloaded: `englishbridge-lms-github.zip` (see `PACKAGE_MANIFEST.txt`)
- A free GitHub account (https://github.com/signup)
- Windows 10/11 with ~500 MB free space
- Extracted folder: `englishbridge-lms` (you will upload this)

**Where to save on Windows:** `C:\Projects\` or `C:\Users\YOURNAME\Documents\` — **not** inside OneDrive-syncing `Desktop` with spaces (avoid `C:\Users\...Desktop\My Projects` — picks spaces).

---

## Option A: Easiest & Safest — GitHub Website (Recommended for Beginners)

> You click, drag, and GitHub does the Git for you. No command line.

### Step 1 — Create Private Repository

1. Go to https://github.com/new (login first)
2. **Owner:** your username (default)
3. **Repository name:** `englishbridge-lms-private` (exactly — lowercase, hyphens only)
4. **Description:** `EnglishBridge LMS — private learning platform` (optional)
5. **Visibility:** choose **Private** (lock icon) — **never Public**
6. Leave **Initialize this repository with...** UNCHECKED (no README, no license — we have files)
7. Click **Create repository**

You will see a page saying `Quick setup — if you’ve done this kind of thing before` — **stop here, don't run the `git` commands shown**.

### Step 2 — Upload Existing Folder (GitHub Web UI)

1. On that Quick setup page, click **uploading an existing file** (blue link under “...create a new repository on the command line”)
   - Alternative: go to https://github.com/USERNAME/englishbridge-lms-private/upload (replace USERNAME/REPO)
2. **Drag and drop:** Open `C:\Projects\englishbridge-lms\` in File Explorer, select **all files inside** (Ctrl+A) — **not the folder itself**, but every file/folder inside: `src`, `public`, `prisma`, `scripts`, `.github`, `package.json`, `.gitignore`, `.env.example` etc. → drag onto GitHub's upload area
   - Tip: If drag fails (500+ files), use **choose your files** button and select in batches: first `src` folder, then `public`, then `prisma`, etc.
3. Wait until GitHub lists all files (scroll down — you should see ~750 files, **not** `prisma/dev.db` or `.env`)
4. Scroll to bottom, write commit message: `Initial commit: sanitized EnglishBridge LMS (Phase 65)`
5. Click **Commit changes** (green button)

**Verify safety:** After upload, check your repo file list:
- ✅ You see `.gitignore`, `.env.example`, `src/app`, `prisma/schema.prisma`, `prisma/migrations`, `.github/workflows/phase63-release-verification.yml`
- ❌ You **do NOT see** `.env`, `prisma/dev.db`, `node_modules/`, `.next/`, `evidence/` — if you do, delete them immediately via GitHub UI (click file → trash icon)

### Step 3 — Run Verification (GitHub Actions)

1. Click **Actions** tab (top) → you will see `Phase63 Release Verification (Private)`
2. Click **Run workflow** (right side, green dropdown) → choose branch `main` → **Run workflow**
3. Wait 6–10 minutes (standard `ubuntu-24.04` runner does `npm ci` → `prisma generate` → lint → typecheck → 6 test suites → `next build` → browser screenshots)
4. Download artifact: bottom of run page → **Artifacts** → `phase63-evidence` ZIP → contains `p63-desktop-progress.png` etc. + `BUILD_ID`

---

## Option B: GitHub Desktop (Also Beginner-Friendly, Visual)

> Good if you want a local copy that stays synced, with buttons instead of commands.

### Install

1. Download **GitHub Desktop**: https://desktop.github.com/ → Install → Login with your GitHub account
2. In app: **File → Add local repository** → choose `C:\Projects\englishbridge-lms` → If asked “create repo?” choose **Create a Repository**, name `englishbridge-lms-private`, keep **Git Ignore: None** (we have `.gitignore`), uncheck **Initialize with README**

### Publish

1. GitHub Desktop shows your files on left (should be ~750, **not** `prisma/dev.db` — check `Changed Files`)
2. Write commit message bottom: `Initial commit: sanitized LMS` → **Commit to main**
3. Click **Publish repository** (top) → uncheck **Keep this code private**? Actually **check** “Keep private” → **Publish**

### Verify

Same as Option A Step 3 (Actions tab on github.com).

---

## Which Should You Use?

| Your comfort | Choose |
|--------------|--------|
| **Never used Git** | **Option A — GitHub Website upload** (simplest, no app install) |
| **Want offline copy + sync button** | **Option B — GitHub Desktop** (visual, private by default) |
| **Terminal already** | `git init && git add ... && git push` (not covered — docs say use graphical) |

**NEVER:** `git add .` from root without checking — use selective list above (`.gitignore` protects you, but verify).

---

## Troubleshooting Upload

| Problem | Fix |
|---------|-----|
| “Upload too large / 100 files” | Upload in batches: `src` first, then rest. Or use GitHub Desktop (handles many files). |
| “This file is ignored” `.env` won't upload | **Correct** — `.env` must never upload. Only `.env.example` (placeholders) is safe. |
| “prisma/dev.db rejected” | Also correct — never include `*.db`. Your ZIP already excludes it. |
| Repo is empty after upload | You dropped the folder itself, not its contents. Open `englishbridge-lms`, select all **inside**, re-upload. |
| “Branch main not found” | Create repo without README as instructed; first upload creates `main`. |

**Next action after upload:** Open `DEPLOYMENT_GUIDE.md` in your repo to understand GitHub vs Actions vs real deployment.

