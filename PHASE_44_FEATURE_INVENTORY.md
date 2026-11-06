# PHASE 44 — Feature Inventory
## EnglishBridge LMS · product discovery, verified against the running application

**Date:** 2026-10-25
**Application:** running at `http://localhost:4044` (dev build, disposable DB copy `/tmp/p44_preview.db`)
**Method:** every route was fetched over HTTP with a real session for its intended role; the server-rendered HTML was parsed for headings, visible text, form controls and tables.

> **Read this first — what "WORKING" means here.**
> No browser was available in this environment (see §0 of the final report). Statuses are derived from
> **server-rendered HTML + real HTTP status codes + working data endpoints** — not from looking at pixels.
> A page marked `WORKING` genuinely renders its content and its data path responds. What is **not** verified
> anywhere in this document is *appearance*: layout, spacing, colour, overflow, responsive behaviour, and
> client-side interaction after hydration. Those are marked `NOT_VERIFIED` wherever they are the whole point
> of the page.

---

## 0. Scale of the application (verified counts)

| Measure | Count | How obtained |
|---|---|---|
| Page routes (`page.tsx`) | **110** | filesystem walk of `src/app` |
| API route handlers (`route.ts`) | **205** | filesystem walk |
| React components (`.tsx`) | **114** in `src/components` | filesystem |
| Client components | **86** of 234 `.tsx` in `app` + `components` | `"use client"` scan |
| UI primitives | **13** (`src/components/ui`) | filesystem |
| Feature component directories | **24** | filesystem |
| Server actions (`"use server"`) | **0** | all mutation goes through API routes |
| `loading.tsx` | **1** (shared by all routes) | filesystem |
| `error.tsx` / `global-error.tsx` | **1 / 1** | filesystem |
| `not-found.tsx` | **1** | filesystem |
| Demo database contents | 87 users, 1 org, 5 groups, 4 courses, 39 lessons, 57 questions, 4 assessments, 15 class sessions, 5 certificates, **0 attempts** | direct query of disposable copy |

**Roles supported:** `ADMIN`, `TEACHER`, `STUDENT` (and `SUPER_ADMIN` in the data model; only three were exercised because the demo seed creates three).

---

## 1. Public routes (no session)

| ID | Route | Purpose | Status | Evidence |
|---|---|---|---|---|
| PUB-01 | `/` | Entry | **WORKING** | `307 → /login` for anonymous visitors — correct gating |
| PUB-02 | `/login` | Sign-in | **WORKING** | Renders h1 "Sign in to your account", 2 labelled inputs, 1 submit, 4 buttons. Compact (376 chars visible text) — no marketing filler |
| PUB-03 | `/unauthorized` | Denied-access landing | **WORKING** | h1 "Access denied", 195 chars, a Back control. Reached by cross-role navigation |
| PUB-04 | `/reset-password/[token]` | Password reset | **WORKING (invalid-token path)** | Invalid token renders "Choose a new password" + form; the *valid-token* path was **not exercised** (no reset token exists in demo data and minting one would be a mutation) |
| PUB-05 | `/invite/[token]` | Invitation acceptance | **WORKING (invalid-token path)** | Invalid token renders "Accept invitation" + form. Valid-token path **not exercised** |
| PUB-06 | `/verify/certificate/[code]` | Public certificate verification | **WORKING** | Bad code → `Status: NOT_FOUND / Not found.` Real code `CERT-2026-000006` → same page, 507 chars. Explicitly states it shows status only, not employee code/email/grades |
| PUB-07 | `/p44-no-such-page` (control) | Unknown URL | **WORKING** | Returns **404** with the custom "Page not found" screen ⚠️ contrast with FIND-01 |

---

## 2. Admin portal — `/admin/*` (34 routes)

**Navigation:** 41 distinct nav links in the rendered sidebar, grouped *Users · Organization · Departments · Groups · Roles · Invitations · Security · Access reviews · Identity audit · System health · Curriculum · Language levels · Books & materials · Content builder · Assessments · Question Bank · Teachers · Students · Certificates · Reports · Automation · Tutor usage · …*

| ID | Route | Purpose | Status | Evidence |
|---|---|---|---|---|
| ADM-01 | `/admin` | Admin dashboard | **WORKING** | Rich render (≥2000 chars) |
| ADM-02 | `/admin/users` | User directory | **WORKING** | Real table, 1 search input, 3 filter selects, pagination rendered as "Showing 1 – 10 of 87 · Prev · Page 1 of 9 · Next". Per-row View actions |
| ADM-03 | `/admin/users/[id]` | User profile | **WORKING (valid id)** / ⚠️ **FIND-01 (missing id)** | Valid id renders profile. **Missing id renders the correct "User not found" empty state but returns HTTP 200** |
| ADM-04 | `/admin/teachers` | Teacher list | **WORKING** | Role-locked list page |
| ADM-05 | `/admin/students` | Student list | **WORKING** | Role-locked list page |
| ADM-06 | `/admin/organization` | Org profile | **WORKING** | Renders |
| ADM-07 | `/admin/departments` | Departments | **WORKING** | Renders |
| ADM-08 | `/admin/groups` | Learning groups | **WORKING** | Renders |
| ADM-09 | `/admin/groups/[id]` | Group detail | **WORKING** | Renders |
| ADM-10 | `/admin/roles` | Role & permission management | **WORKING** | Renders; permission matrix present |
| ADM-11 | `/admin/invitations` | Invitations | **WORKING** | Renders |
| ADM-12 | `/admin/security` | Security settings | **WORKING** | Renders |
| ADM-13 | `/admin/access-reviews` | Access review campaigns | **WORKING** | Renders |
| ADM-14 | `/admin/audit` | Identity audit log | **WORKING** | Renders |
| ADM-15 | `/admin/system-health` | Live system probe | **WORKING** | Real data: "Overall: HEALTHY · Database HEALTHY · Query probe succeeded · Probe latency: 6 ms". States it contacts no optional providers |
| ADM-16 | `/admin/backups` | Backup & DR | **PARTIALLY_WORKING** | Real record rendered: "Latest 10/25/2026 1:24:57 PM · Status VERIFIED · Total 5". ⚠️ see FIND-06 (provenance of that record); restore is staging-only by design and **was not exercised** |
| ADM-17 | `/admin/curriculum` | Curriculum | **WORKING** | Renders |
| ADM-18 | `/admin/curriculum/[courseId]` | Course curriculum | **WORKING** | Renders with a real course id |
| ADM-19 | `/admin/learning-levels` | Language levels | **WORKING** | Renders |
| ADM-20 | `/admin/books` | Books & materials | **WORKING** | Renders |
| ADM-21 | `/admin/content` | Content builder entry | **WORKING** | Renders |
| ADM-22 | `/admin/certificates` | Certificates | **WORKING** | Renders |
| ADM-23 | `/admin/reports` | Reporting | **WORKING** | Renders |
| ADM-24 | `/admin/automation` | Workflow automation | **WORKING** | Renders: "Build event-based automations… Overview · Workflows · Templates · Runs · Approvals". Tabs render; tab *content* is client-side → interaction **NOT_VERIFIED** |
| ADM-25 | `/admin/ai` | Tutor usage | **WORKING** | Renders |
| ADM-26 | `/admin/gamification` | Gamification config | **WORKING** | Renders |
| ADM-27 | `/admin/announcements` | Announcements | **WORKING** | Renders |
| ADM-28 | `/admin/messages` | Messaging | **WORKING** | Renders |
| ADM-29 | `/admin/notifications` | Notifications | **WORKING** | Renders |
| ADM-30 | `/admin/settings` | Platform settings | **WORKING** | Renders |
| ADM-31 | `/admin/settings/integrations` | Integration settings | **WORKING** | Renders |
| ADM-32 | `/admin/learning` | Learning overview | **WORKING** | Renders |
| ADM-33 | `/admin/account` | Admin own account | **WORKING** | Renders |
| ADM-34 | `/admin/voice` | Voice feature admin | **WORKING** | Renders |

**Cross-namespace nav (observation, not a defect):** the admin sidebar links to `/teacher/exams` and `/teacher/questions`. These **do** work for an admin — both routes call `requirePageUser(["TEACHER","ADMIN"])`. Verified `200` for all five sampled `/teacher/*` routes as admin. Side effect is documented as FIND-08.

---

## 3. Teacher portal — `/teacher/*` (41 routes)

**Navigation:** 47 distinct nav links, grouped *Learning plans · Engagement · My Groups · Students · Schedule · Courses · Books & materials · Content builder · Assignments · Teaching plan · Assessments · Question Bank · Results · Attendance · Tutor settings · Speaking · Listening · Certificates · Reports · Security*, plus a "Need a look 12" attention badge linking to `/teacher/students?attention=1`.

| ID | Route | Purpose | Status | Evidence |
|---|---|---|---|---|
| TCH-01 | `/teacher` | Teacher dashboard | **WORKING** | Rich render |
| TCH-02 | `/teacher/classes` | Schedule (classes/exams/deadlines) | **WORKING** | Renders "Schedule a class · Add a weekly rule · Today/Week/Month". Empty state "Nothing is scheduled in this range" — plausible since demo sessions predate the window (FIND-07 note) |
| TCH-03 | `/teacher/classes/[id]` | **Classroom session** | **WORKING (session id)** | With a real `ClassSession` id → **51,758 B**, h1 "Shift A English class". ⚠️ Requires a *session* id, not a group id |
| TCH-04 | `/teacher/groups` | Groups | **WORKING** | Renders |
| TCH-05 | `/teacher/groups/[id]` | Group detail | **WORKING** | Renders |
| TCH-06 | `/teacher/students` | Students | **WORKING** | Renders; attention filter supported |
| TCH-07 | `/teacher/students/[id]` | Student detail | **WORKING** | Progress + attempts queried |
| TCH-08 | `/teacher/assignments` | Assignments | **WORKING** | Renders |
| TCH-09 | `/teacher/assignments/new` | Create assignment | **WORKING (form renders)** | Form renders; **submission not exercised** |
| TCH-10 | `/teacher/assignments/[id]` | Assignment detail | **WORKING** | Renders |
| TCH-11 | `/teacher/exams` | Assessments | **WORKING** | Renders |
| TCH-12 | `/teacher/exams/new` | Create assessment | **WORKING (form renders)** | Form renders; submission not exercised |
| TCH-13 | `/teacher/exams/blueprint` | Blueprint builder | **WORKING** | Renders |
| TCH-14 | `/teacher/exams/reviews` | Marking reviews | **WORKING** | Renders |
| TCH-15 | `/teacher/exams/[id]` | Assessment detail | **WORKING** | Renders with a real assessment id |
| TCH-16 | `/teacher/questions` | Question bank (57 questions) | **WORKING** | Renders |
| TCH-17 | `/teacher/questions/new` | Create question | **WORKING (form renders)** | Renders; submission not exercised |
| TCH-18 | `/teacher/questions/[id]` | Question detail | **WORKING** | Renders |
| TCH-19 | `/teacher/results` | Results list | **PARTIALLY_WORKING** | Paginated but **no search** (FIND-04); with 0 attempts the list is empty |
| TCH-20 | `/teacher/results/[attemptId]` | Attempt review | **NOT_VERIFIED** | No `assessmentAttempt` existed in demo data; I created one (journey J5) but did not re-probe this route with it — see final report §9 |
| TCH-21 | `/teacher/attendance` | Attendance | **WORKING** | **200**, 72 KB. An initial `000` was a transient dev-server restart, not a defect |
| TCH-22 | `/teacher/plans` | Teaching plan | **WORKING** | Renders |
| TCH-23 | `/teacher/learning` | Learning plans | **WORKING** | Renders |
| TCH-24 | `/teacher/learning/[studentId]` | Per-student learning | **WORKING** | Renders |
| TCH-25 | `/teacher/engagement` | Engagement | **WORKING** | Renders |
| TCH-26 | `/teacher/courses` | Courses | **WORKING** | Renders |
| TCH-27 | `/teacher/courses/lessons/[id]` | Lesson editor | **WORKING** | Renders with a real lesson id |
| TCH-28 | `/teacher/content` | Content entry | **WORKING** | Renders |
| TCH-29 | `/teacher/content/library` | Content library | **WORKING** | Renders |
| TCH-30 | `/teacher/content/course/[id]` | Course content | **WORKING** | Renders with a real course id |
| TCH-31 | `/teacher/content/builder/[id]` | Lesson builder | **NOT_VERIFIED** | Server component renders only chrome + `Loading…`; body is client-side |
| TCH-32 | `/teacher/content/preview/[id]` | Content preview | **NOT_VERIFIED** | Same as TCH-31 |
| TCH-33 | `/teacher/books` | Books & materials | **WORKING** | Renders |
| TCH-34 | `/teacher/messages` | Messaging | **WORKING** | Renders |
| TCH-35 | `/teacher/announcements` | Announcements | **WORKING** | Renders |
| TCH-36 | `/teacher/notifications` | Notifications | **WORKING** | Renders |
| TCH-37 | `/teacher/speaking` | Speaking lab | **WORKING** | Renders with explicit privacy copy |
| TCH-38 | `/teacher/listening` | Listening lab | **WORKING** | Renders, 1 form |
| TCH-39 | `/teacher/certificates` | Certificates | **WORKING** | Renders |
| TCH-40 | `/teacher/reports` | Reports | **WORKING** | Renders |
| TCH-41 | `/teacher/security` | Security | **WORKING** | Renders |

---

## 4. Student portal — `/student/*` (31 routes)

**Navigation:** 27 distinct nav links, grouped *Today's plan · Achievements · My Learning · Assignments · Exams · Certificates · Review · Progress · English Tutor · Speaking · Listening · Profile · Security*. Dashboard also surfaces up to three **Start** buttons for available exams.

| ID | Route | Purpose | Status | Evidence |
|---|---|---|---|---|
| STU-01 | `/student` | Student dashboard | **WORKING** | Rich render; exam Start links present |
| STU-02 | `/student/plan` | Today's plan | **WORKING** | Renders |
| STU-03 | `/student/learning` | My learning | **WORKING** | Renders |
| STU-04 | `/student/learn/[id]` | Lesson player | **PARTIALLY_WORKING** | Renders (thin server HTML); interactive player **NOT_VERIFIED** |
| STU-05 | `/student/assignments` | Assignments | **WORKING** | Renders |
| STU-06 | `/student/assignments/[id]` | Assignment detail | **WORKING** | Real content: "P5 late closed · Due 30 Sept 2026 · The due time has passed and late submissions are not allowed" — a correct blocked state |
| STU-07 | `/student/exams` | Available exams | **WORKING** | Renders; Start actions |
| STU-08 | `/student/exams/[id]` | Exam overview | **WORKING** | Renders with a real assessment id |
| STU-09 | `/student/exams/[id]/take` | **Exam-taking UI** | **PARTIALLY_WORKING** | Page returns 200 (68 KB) and the data API serves 8 questions with options; the rendered shell ends at `Loading…` so the *interface* is client-side → **NOT_VERIFIED visually** |
| STU-10 | `/student/exams/[id]/result` | Result screen | **NOT_VERIFIED** | No attempt existed at crawl time |
| STU-11 | `/student/certificates` | Certificates (5 exist) | **WORKING** | Renders |
| STU-12 | `/student/review` | Spaced review | **WORKING** | Renders |
| STU-13 | `/student/progress` | Progress | **WORKING** | Renders |
| STU-14 | `/student/achievements` | Achievements | **WORKING** | Renders |
| STU-15 | `/student/tutor` | **AI practice tutor** | **WORKING (surface)** | Renders "English Tutor · Practice assistant · Level: A2 · This is AI Practice, not a teacher and not an exam", themes: Conversation/Vocabulary/Grammar/Lesson help/Mistake review/Quiz me. Conversational turn-taking **NOT_VERIFIED** (needs browser + an AI provider key) |
| STU-16 | `/student/tutor/history` | Tutor history | **WORKING** | Renders (thin — empty state) |
| STU-17 | `/student/speaking` | Speaking lab | **WORKING (consent gate)** | Renders an explicit privacy consent screen: "The microphone stays on this device. We save the text that was recognized. We do not save the recording. [I understand]". Recording itself **NOT_VERIFIED** (needs browser + mic) |
| STU-18 | `/student/speaking/history` | Speaking history | **WORKING** | Renders |
| STU-19 | `/student/listening` | Listening lab | **WORKING** | Renders, 1 form, 14 buttons |
| STU-20 | `/student/schedule` | Schedule | **WORKING** | Renders |
| STU-21 | `/student/messages` | Messaging | **WORKING** | Renders, 2 forms |
| STU-22 | `/student/announcements` | Announcements | **WORKING** | Renders |
| STU-23 | `/student/notifications` | Notifications | **WORKING** | Renders |
| STU-24 | `/student/notifications/preferences` | Notification prefs | **WORKING** | Renders |
| STU-25 | `/student/profile` | Profile | **WORKING** | Renders |
| STU-26 | `/student/security` | Security settings | **WORKING** | Renders |
| STU-27 | `/student/training-record` | Training record | **WORKING** | Renders |
| STU-28 | `/student/achievements` | (see STU-14) | — | — |
| STU-29 | `/dashboard` (shared) | Legacy dashboard | **WORKING** | `307 → /login?next=/dashboard` when anonymous |
| STU-30 | `/notifications` (shared) | Legacy notifications | **WORKING** | `307 → /login` when anonymous |

---

## 5. Cross-cutting UI capabilities

| Capability | Status | Evidence |
|---|---|---|
| Responsive shell | **PARTIALLY VERIFIED** | `app-shell.tsx` uses `sm:`/`lg:`/`xl:` breakpoints; a dedicated `bottom-nav.tsx` and `mobile-shortcuts.tsx` exist, and the PWA manifest declares phone/tablet/desktop. Layout at real viewport widths **NOT_VERIFIED** (no browser) |
| PWA / offline | **WORKING (wiring)** | `public/manifest.webmanifest`, `public/sw.js`, `pwa-register.tsx` + `offline-banner.tsx` wired into the shell. Offline behaviour **NOT_VERIFIED** |
| Empty states | **WORKING** | Multiple confirmed: "Nothing is scheduled in this range", "User not found. This account may have been removed or the link is incorrect.", assignment blocked state |
| Error boundary | **WORKING** | Custom `error.tsx` ("Something went wrong") and `global-error.tsx` ("This page could not load" + reference digest). Neither exposes stack traces |
| Not-found boundary | **WORKING** | Custom "Page not found" with a Back-to-dashboard action |
| Loading states | **PARTIALLY_WORKING** | Exactly **one** `loading.tsx` for all 110 routes → a generic full-page spinner, no per-page skeletons |
| Form validation feedback | **WORKING** | Login returns `422` with per-field messages (`fieldErrors.identifier`, `fieldErrors.password`) and a human summary |
| Accessibility basics | **WORKING (source-level)** | 0 icon-only buttons without `aria-label`; 0 `<img>` without `alt`; 30 files use `<select>` with labelled controls |
| Tables | **MIXED** | Only 6 `<table>` elements app-wide and **no shared Table primitive** — most lists use bespoke markup (FIND-05) |
| Search | **LIMITED** | 7 files contain a search input against 110 routes; 4 components use pagination — most lists are unpaginated (FIND-04) |

---

## 6. Routes that could not be reached or exercised

| Route | Why | What would be needed |
|---|---|---|
| `/student/exams/[id]/take`, `/result` | Rendered shell is client-side; no attempt existed before this phase | A browser |
| `/teacher/content/builder/[id]`, `/preview/[id]` | Body is client-only | A browser |
| `/teacher/results/[attemptId]` | No attempt existed in demo data | A seeded attempt (I created one in J5 but did not re-probe) |
| `/reset-password/[token]` (valid), `/invite/[token]` (valid) | No valid tokens exist; minting one is a mutation | A crafted token in a disposable DB |
| `/verify/certificate` with a *revoked* certificate | No revoked certificate in demo data | A seeded revocation |
| `/admin/backups` restore actions | Staging-only by design | Organizational staging (blocked, Phase 37) |

---

## 7. Notes on data authenticity (not defects)

- The demo database contains **`alex.sync.*` student accounts** (integration-test residue) alongside the realistic seed users.
- It contains **one backup record marked `VERIFIED` dated 2026-10-25 13:24** — i.e. generated shortly before this phase. Provenance is unclear; recorded as FIND-06 rather than assumed benign or assumed wrong.
- Default date-window views (e.g. Schedule "Today/Week/Month") look empty because the seeded sessions predate the window. This is correct behaviour producing a misleading first impression — FIND-07.
