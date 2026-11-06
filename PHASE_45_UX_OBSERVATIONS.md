# PHASE 45 — UX Observations
## Practical friction seen in a real browser

**Date:** 2026-10-25 · Evidence in `/home/user/evidence/`

> These are **observations, not defects**. Nothing here is broken; each item is a judgement about friction, supported by a screenshot or a measured count. Nothing was implemented.

---

## What is genuinely good

Stated first, because it should shape what Phase 46 does *not* do:

- **The visual system holds together.** One sidebar, one header, one card style, consistent status pills, consistent destructive/safe button weighting. Moving between pages does not feel like moving between products.
- **Mobile is not an afterthought.** At 375 px the sidebar correctly becomes a sticky bottom nav, the header collapses to a hamburger, and quick-action chips scroll horizontally. **Zero horizontal overflow** on all 8 pages tested across two roles (`evidence/F1-*`, `evidence/I4-*`).
- **Destructive and irreversible actions are guarded.** Starting a timed exam shows a confirmation; submitting shows `Keep working` / `Submit final answers`. A student cannot lose an attempt to a stray click.
- **Recovery paths exist everywhere.** In-progress attempts say *"Your timer is still running — continue where you left off"* with a **Resume quiz** button (`evidence/B9-exam-resume-state.png`). Missing records offer "Back to users". Empty search says "No users match your filters".
- **The app explains its own limits.** The speaking lab and certificate pages state plainly what is stored and what is not. The tutor says *"This is AI Practice, not a teacher and not an exam."*
- **Accessibility hygiene is real**: no icon-only button lacked an `aria-label` in the source scan, and no image lacked `alt`.

---

## Observations

### UX-01 · Three different "levels" on one screen

**Where:** student dashboard, top band and hero (`evidence/H2-student-hero-desktop.png`)
**What:** the screen simultaneously shows **`Current level · A2`**, **`Goal · B1`**, and **`Starter / Pre-A1`** next to the Continue button, plus **`Learning Level 4`** with its own XP bar further down. Four level-ish concepts.
**Why it matters:** the app does try to disambiguate (*"This is not your English level. English level stays on your course and assessments."*), which is a good instinct — but a learner reading the top of their own dashboard meets A2, B1 and Pre-A1 within 400 pixels.
**Suggestion:** keep `Current level` and `Goal` as the only two at the top; move the gamification level into the Motivation card where it already is, and drop the `Starter / Pre-A1` chip or pair it with the course name ("Course: Starter / Pre-A1").

### UX-02 · Fourteen Save buttons on one settings page

**Where:** `/student/notifications/preferences` (`evidence/G1-prefs-saved.png`)
**What:** **14 sections**, each with 4 checkboxes and its own button (`Save ACADEMIC`, `Save ASSIGNMENT`, … `Save SYSTEM`, `Save MESSAGE`). 56 checkboxes, 14 saves.
**Why it matters:** a user who changes two things in two sections must remember to press two buttons. Silently losing a toggle is the predictable failure — and my own first test *did* exactly that.
**Suggestion:** a single sticky "Save changes" for the page with per-section dirty indicators, or auto-save with an inline "Saved" confirmation. Either removes a whole class of user error.

### UX-03 · Native validation bubbles next to custom inline errors

**Where:** `/teacher/assignments/new` vs `/login`
**What:** the login form shows styled, persistent inline messages under each field. The assignment form relies on the browser's native bubble — *"Please fill out this field."* — which disappears on the next interaction and is not tied to the field markup.
**Screenshot:** `evidence/D4-assignment-validation.png`
**Why it matters:** two validation idioms in one product; the bubble also cannot be styled and reads differently in every browser and locale.
**Suggestion:** reuse the `FormField` error pattern already built for login.

### UX-04 · "Start" buttons with no distinguishing label

**Where:** student dashboard and exams list (`evidence/B0-student-dashboard-full.png`, `evidence/B1-exams-list.png`)
**What:** several buttons all read **Start**; they point at different assessments. The exams *list* does label them well ("Quiz 1: Basic Greetings · 8 questions · 10 min"), but the dashboard's quick links do not.
**Suggestion:** carry the assessment name into the label or add the duration, e.g. `Start · Quiz 2 · 10 min`.

### UX-05 · Empty schedule reads as a fault

**Where:** `/teacher/classes` (Phase 44 FIND-07, reconfirmed)
**What:** *"Nothing is scheduled in this range"* renders while 15 class sessions exist — they simply fall outside the default window.
**Suggestion:** make the empty state informative rather than blank: *"Nothing today · next class 12 Nov"* with a jump to that period.

### UX-06 · Submit control sits inside the question navigator

**Where:** exam take screen (`evidence/B8-exam-taking.png`)
**What:** `Previous · Next · Submit now` share a row directly beneath a grid of numbered question buttons; `Submit now` is adjacent to navigation with no separation.
**Suggestion:** separate the destructive-ish action from the navigational ones. (Recorded as BUG-03 as well, since the mis-click risk is functional, but the primary complaint is layout.)

### UX-07 · Duplicate doorways to the same tools

**Where:** admin sidebar
**What:** admin nav links to `/teacher/exams` and `/teacher/questions`. They work (verified) but silently switch the user into the teacher shell, so the admin sidebar is replaced mid-task.
**Suggestion:** either surface these under `/admin/*` with the admin chrome, or mark the entries as "opens teacher tools".

### UX-08 · Search is not where users learn to expect it

**Where:** `/teacher/results` (BUG-01) vs `/admin/users` (has search)
**What:** two record lists, two different capability sets. The weaker one is the teacher's daily screen.
**Suggestion:** treat `/admin/users` as the pattern and port it.

---

## Environment artifacts — explicitly **not** product issues

Recorded so they are not mistaken for defects:

| Artifact | Reality |
|---|---|
| A `<nextjs-portal>` element swallowed clicks on the account menu | Next.js **dev overlay**; absent in production |
| Console: *"Evaluating a string as JavaScript violates CSP… 'unsafe-eval'"* repeatedly | Dev tooling under a **report-only** CSP. Not a production finding |
| Console: *"Detected `scroll-behavior: smooth`…"* warning | Next.js dev-mode advisory |
| Dev server restarted twice mid-session | 1.9 GB host memory ceiling, not the application |
| Route transitions took 1–6 s | Dev-mode compilation; production build is precompiled |
| `next start` refused to boot | Correct behaviour: production mode requires PostgreSQL + HTTPS + secrets I must not fabricate |

---

## Suggested improvement order (do not implement yet)

1. **UX-02** — one Save per settings page (prevents silent data loss)
2. **UX-01** — reduce level concepts on the dashboard
3. **UX-04 / UX-05** — label and empty-state copy; cheap, high clarity
4. **UX-03** — one validation idiom
5. **UX-06 / UX-07 / UX-08** — layout and navigation consistency

None of these require a redesign. The application's structure is sound; the friction is in edge copy, duplicated controls, and inconsistent application of patterns that already exist elsewhere in the codebase.
