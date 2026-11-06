# EnglishBridge LMS — Phase 1 + 2

A professional, scalable English Learning Management System for organizational
training (initial learners: Firefighter Shifts A–D and Day Workers — all as
learning **groups inside one centralized platform**, never separate systems).

**Phase 1 (foundation):** architecture, design system, real authentication,
role-based authorization (STUDENT / TEACHER / ADMIN), user & group management,
role dashboards, student profiles, audit trail.

**Phase 2 (student learning experience):** level system (Pre-A1 → C2), the
course → module → lesson engine, a typed content-block system, vocabulary &
grammar content, real lesson-completion tracking with calculated progress,
a guided student dashboard, My Learning, My Progress, and a complete,
genuinely beginner-friendly **English Starter (Pre-A1)** curriculum — 6
modules, 25 lessons, 100 vocabulary items with Persian translations.

---

## Tech stack

| Layer      | Choice | Notes |
|------------|--------|-------|
| Framework  | **Next.js 14 (App Router) + TypeScript** | Full-stack in one codebase: React Server Components for reads, Route Handlers as the protected JSON API |
| Database   | **Prisma ORM + SQLite** (dev) | Schema is written portable → production: switch `provider` to `postgresql` in `prisma/schema.prisma` + change `DATABASE_URL` |
| Auth       | **Custom session auth**: bcryptjs (12 rounds) + `jose` HS256 JWT in an httpOnly cookie | Edge-verified in middleware, **re-validated against the DB on every server request** (deactivation/role changes take effect immediately) |
| Validation | **zod** | One schema per payload, enforced client- *and* server-side |
| UI         | **Tailwind CSS** design system + lucide-react icons | Calm, professional, mobile-first, accessible (keyboard, aria, contrast) |

## Quick start

```bash
npm install          # also runs `prisma generate`
npm run db:push      # create the SQLite database
npm run db:seed      # ⚠ development demo data (see below)
npm run dev          # http://localhost:3000
```

Production-style run: `npm run build && npm start`.

Environment (`.env`, see `.env.example`):

```
DATABASE_URL="file:./dev.db"          # → postgresql://… in production
SESSION_SECRET="<openssl rand -hex 32>"
NEXT_PUBLIC_DEMO_HINTS="false"        # must be false in production
```

## ⚠ Development demo accounts (seed only)

Created by `npm run db:seed` — clearly marked demo accounts with well-known
passwords. **Never seed production** (the seed refuses to run with
`NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is set explicitly, and
demo hints are controlled by `NEXT_PUBLIC_DEMO_HINTS`).

| Role    | Username         | Password         |
|---------|------------------|------------------|
| Admin   | `admin`          | `Admin#Demo1`    |
| Teacher | `sara.whitfield` | `Teacher#Demo1`  |
| Student | `james.carter`   | `Student#Demo1`  |

Seed also creates the five initial learning groups (Shifts A–D + Day Workers),
11 students spread across them (one intentionally INACTIVE to demo soft
deactivation), and assigns Sara Whitfield as lead teacher of Shifts A & B.

## Project layout

```
prisma/            schema.prisma, seed.ts, dev.db
prisma/curriculum/ Pre-A1 seed content (real lessons, vocabulary, grammar)
src/
  middleware.ts    edge route protection (coarse layer)
  app/
    login/         public sign-in
    (app)/         authenticated shell (session re-validated in layout)
      student/…    dashboard, learning (My Learning), learn/[id] (lesson page),
                   progress, profile, schedule/exams (future-phase states)
      teacher/…    dashboard, groups (shows assigned courses), students (+[id]), …
      admin/…      dashboard, users (+[id], teachers, students), groups (+[id]),
                   curriculum (+[courseId], read-only), settings (audit log)
      dashboard/   role-neutral alias → redirects to role home
    unauthorized/  403 page
    api/           auth/*, users, groups (+members, available-students),
                   lessons/[id]/access, lessons/[id]/complete
  components/
    ui/            design-system primitives (button, field, card, badge, dialog,
                   toast, empty-state, pagination, progress-bar, search-input, …)
    layout/        app shell, sidebar/drawer nav, user menu, brand
    learn/         content-block renderers, vocabulary list, grammar panel,
                   question (practice) block, complete button, lesson nav
    learning/      My Learning course/module/lesson map
    progress/      My Progress page body
    dashboard/     student/teacher/admin dashboards
    admin/users/   user management (shared list for all/users/teachers/students)
    admin/groups/  group management + member assignment
    profile/       student profile (student self-view, teacher, admin) + coming-soon
    auth/          login form
  lib/             auth, api (central errors + guards), validations, queries,
                   learning (assigned courses + progress logic), blocks (payload
                   schemas), audit, constants (all registries), nav, rate-limit, utils
```

## Scripts

| Script              | Purpose |
|---------------------|---------|
| `npm run dev`       | Development server |
| `npm run build`     | Prisma generate + production build |
| `npm start`         | Production server |
| `npm run db:push`   | Apply schema to the database |
| `npm run db:seed`   | Seed development demo data |
| `npm run db:reset`  | Recreate + reseed the database |
| `npm run typecheck` | `tsc --noEmit` |

## Security model (summary)

- Passwords: bcrypt, 12 rounds. Never logged, never returned by any API.
- Sessions: httpOnly + SameSite=Lax (+ Secure in production) JWT cookie,
  7-day expiry. Token carries only identity + a password-version fingerprint;
  role/status/group are read fresh from the DB per request, so deactivation,
  role changes and password resets revoke access instantly.
- Authorization: middleware (edge) → layout guards (pages) → `requireApiUser`
  (APIs). Three independent layers; the DB-backed layer is authoritative.
- Login: generic error messages (no user enumeration), in-memory rate limit
  (5 failures / 5 min per IP+identifier), deactivated accounts rejected.
- CSRF: SameSite cookies + Origin/Host validation on all mutations.
- Audit: all administrative actions recorded (never credentials).
- Admin safety: cannot deactivate self; the last active admin cannot be
  demoted or deactivated; users are soft-deactivated, never hard-deleted.

## Learning model (Phase 2)

- **Levels:** `levels` table, PRE_A1 (shown as "Starter / Pre-A1") is the first
  ACTIVE level; A1–C2 rows exist but are INACTIVE until content ships.
- **Curriculum:** courses → modules → lessons, each with a DRAFT/PUBLISHED/
  ARCHIVED lifecycle. Students only ever see PUBLISHED content.
- **Content blocks:** lessons are typed blocks (TEXT, HEADING, IMAGE, EXAMPLE,
  VOCABULARY, GRAMMAR, AUDIO, VIDEO, TIP, WARNING, QUESTION) stored as
  validated JSON — the schema for the future teacher content builder.
- **Assignment:** courses are assigned to learning groups
  (`course_assignments`); a student sees exactly what their group gets.
- **Progress:** `student_lesson_progress` (unique per student+lesson, statuses
  NOT_STARTED / IN_PROGRESS / COMPLETED). All percentages are CALCULATED from
  real records — never stored or fabricated. The streak comes from real
  activity timestamps.
- **No artificial locking:** lessons are always accessible; the UI marks the
  recommended next lesson instead of pretending prerequisites exist.

## Practice engine (Phase 3)

The lesson system is now a real interactive practice loop:
LEARN → PRACTICE → FEEDBACK → REVIEW → PROGRESS.

- **10 reusable activity types** (one `activities` table, JSON configuration
  validated server-side with zod — no per-type tables, no per-page hardcoding):
  MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK, MATCHING, WORD_ORDER,
  VOCABULARY_RECOGNITION, LISTEN_AND_CHOOSE, LISTEN_AND_TYPE, SPEAKING_PROMPT,
  FLASHCARD. New types = new schema entry + renderer.
- **Server-side everything that matters:** configurations are sanitized before
  reaching the client (correct answers, accepted answers, word order and
  listening transcripts are stripped; options/tokens/pairs shuffled per
  request); every answer is checked on the server; the student on every attempt
  comes from the session — never the request body.
- **Append-only attempts:** every submission writes a new
  `activity_attempts` row (answer, is_correct, score, attempt_number). History
  is never overwritten; retries simply add rows.
- **Immediate, beginner-friendly feedback** ("We use 'am' with 'I.'") and a
  Review Mistakes panel showing question / your answer / correct answer.
- **Practice Score:** percent of the lesson's scored activities answered
  correctly on the latest attempt — labelled "Practice Score", explicitly not
  an exam.
- **Completion rule** (per course): VIEW_ONLY or VIEW + REQUIRED ACTIVITIES
  (default). Enforced server-side in the completion API; the UI explains
  exactly what is left.
- **Vocabulary review:** flashcard self-assessment (Known / Review again)
  schedules the next review — stored as DATA (`vocabulary_review.dueAt`,
  statuses New/Learning/Review/Mastered). "Known" is never permanent mastery.
  No "scientific spaced repetition" claims — just simple, visible scheduling.
- **Real audio only:** listening activities ship with real audio files
  (`public/audio/*.mp3`). If audio is missing the player says "Audio is not
  available yet." — never a broken player. Speaking practice never scores
  pronunciation and never claims correctness.
- **Student dashboard:** Practice Today, Vocabulary Review ("8 words ready" +
  Review now), Recent Practice (real attempts), plus real course progress.
  **My Progress** shows activities practiced, accuracy, listening/grammar/
  vocabulary counts — every number computed from real records.
- **Accessibility & mobile:** ≥44px touch targets, tap-based interactions (no
  drag), keyboard-friendly inputs, screen-reader feedback via aria-live,
  correctness never by color alone, `prefers-reduced-motion` respected.
- **Seeded content:** 65 real activities across 14 lessons (greetings, name,
  alphabet, numbers, colors, family, objects, pronouns, verb to be, this/that,
  questions, days…), validated with the same zod schemas at seed time.
  Idempotent: re-running `npm run db:seed` never duplicates.

**APIs (all session-scoped):** `POST /api/activities/[id]/attempts`,
`GET /api/lessons/[id]/practice`, `GET /api/practice/mistakes`,
`GET /api/practice/stats`, `GET|POST /api/vocabulary/review`.

**Verification:** `bash scripts/testing/verify-phase3.sh` (58 checks) plus the
Phase 1/2 regression suites — 118 automated checks green, including isolation
between students, forged-payload rejection (422), duplicate submissions,
append-only history, refresh persistence and completion gating.

## Assessments (Phase 4)

Practice, quizzes and exams are separate records and are never mixed.

- **Quizzes and exams** are built from a reusable question bank
  (`questions` + `question_options`). An assessment is a title, type
  (QUIZ | EXAM), course scope, duration, passing score, attempt limit,
  schedule (`start_at` / `end_at`) and an ordered, weighted question list.
- **Six auto-graded types:** multiple choice, true/false, fill-the-blank
  (normalized, not fuzzy), matching, word order, listening. Reading, writing
  and speaking can be stored and are clearly marked as needing teacher grading
  later — they are never auto-scored.
- **Server-owned exam session:** the official start time and deadline are
  server timestamps. Refreshing cannot reset the timer. Answers are saved
  progressively; a failed save is shown and retried. Submission is graded
  inside a transaction and cannot be repeated. Time expiry and closing an
  assessment both finalize the sitting from the answers already saved.
- **Results stay private:** a student sees only their own attempts. Teachers
  see results for groups they teach. Admins see all. Correct answers never
  leave the server before submission, and are hidden after submission when
  `show_correct_answers` is off.
- **Pass/fail** uses the configured percentage, shown as “✓ Passed” or
  “✗ Not Passed” (icon and text). Every attempt is kept — retakes never
  overwrite history.
- **Teacher tools:** assessment builder (settings, question picker, publish),
  question bank (search, filters, pagination, create/edit/archive), results
  table with filters, and group/skill summaries. No leaderboard and no
  individual public ranking.
- **Seeded content:** 57 real Pre-A1 bank questions and 4 assessments
  (Greetings, Alphabet & Numbers, Verb to be, and a scheduled Starter final
  exam). Idempotent with `npm run db:seed`.

**Verification:** `bash scripts/testing/verify-phase4.sh` (71 checks) plus the
Phase 1–3 suites — 189 automated checks green.

## Roadmap

- **Phase 5 (recommended next):** teacher grading for writing/speaking,
  per-group exam targeting, and a content builder for lesson activities.
- **Later:** certificates, notifications, attendance, AI tutor. Leaderboards,
  AI grading and automatic CEFR placement stay out of scope by design.
