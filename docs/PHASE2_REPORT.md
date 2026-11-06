# Phase 2 — Implementation Report

**Project:** EnglishBridge LMS — student learning experience + course/lesson engine
**Scope:** Complete student learning flow, Pre-A1 curriculum with real content, real progress tracking
**Status:** ✅ Implemented, built, and verified (Phase 1 architecture preserved — nothing rebuilt)

---

## 1. What was implemented

- **Level system** — `levels` table with id/code/name/displayName/description/order/status.
  PRE_A1 is the first ACTIVE level, displayed as **"Starter / Pre-A1"** to students;
  A1–C2 rows exist INACTIVE, ready for future content.
- **Course engine** — Course → Module → Lesson hierarchy, each with a
  DRAFT / PUBLISHED / ARCHIVED lifecycle. Students only ever see PUBLISHED content
  in ACTIVE levels (enforced in the data layer, verified).
- **Content-block system** — 11 typed blocks (TEXT, HEADING, IMAGE, EXAMPLE,
  VOCABULARY, GRAMMAR, AUDIO, VIDEO, TIP, WARNING, QUESTION), stored as validated
  JSON payloads (zod schemas per type in `src/lib/blocks.ts`). Invalid blocks are
  dropped with a server log, never crash a lesson. This is the schema the future
  teacher content builder will author against.
- **Vocabulary model + display** — word, translation, pronunciation, phonetic (IPA),
  example sentence, audio/image URLs. Audio player renders **only when a real URL
  exists** (no fake players). Seed content includes Persian translations.
- **Grammar model + display** — title, explanation, pattern lines, examples rendered
  in a clean panel; 6 lessons carry real grammar content (pronouns, verb "to be",
  this/that, questions, daily routine, I am/You are).
- **Student learning flow** — dashboard → My Learning → lesson page → mark complete →
  calculated progress. Lesson page shows objectives, duration, position
  ("Lesson 3 of 5", "Module 2 of 6"), content blocks, vocabulary, grammar, a Practice
  section (self-check questions with reveal-answer — honest, not graded), completion
  button, and prev/next navigation (sticky bottom bar on mobile).
- **Real progress tracking** — `student_lesson_progress` (unique per student+lesson;
  NOT_STARTED / IN_PROGRESS / COMPLETED, started/completed/lastAccessedAt,
  best-effort timeSpentSec). Access tracking marks IN_PROGRESS without ever
  downgrading COMPLETED. All percentages are **calculated** from records (never
  stored, never fabricated).
- **Student dashboard upgrade** — welcome, current level, overall progress (0–100%,
  real), Continue Learning card (current + next lesson), recent lessons (real
  activity), upcoming-classes empty state, and a learning streak computed from real
  activity timestamps (shown only when it exists).
- **My Learning** — full course map: per-module progress ("2 of 4 done"), lesson
  rows with accessible status icons (✓/▶/○ + screen-reader text), and a "Start here"
  marker on the recommended next lesson. **No artificial locks** — there is no
  prerequisite system, so lessons stay accessible.
- **My Progress** — real level/course/module percentages, per-module breakdown,
  recently-completed list.
- **Admin/teacher compatibility** — new admin **Curriculum** section (read-only
  levels → courses → modules → lessons with publishing status and assigned groups;
  editing arrives with the Phase 3 content builder). Teacher My Groups cards now
  show the courses assigned to each group. No fake editing UIs.
- **Seed content** — a complete, genuine Pre-A1 curriculum: **1 course, 6 modules,
  25 published lessons, 125 content blocks, 100 vocabulary items (with Persian
  translations and IPA), 6 grammar concepts** — written for absolute beginners,
  assigned to all 5 learning groups. Seed is idempotent (re-running never destroys
  student progress). **No progress is seeded** — it only comes from real use.

## 2. Database changes

New tables (all with FKs, indexes, timestamps; existing tables untouched):

| Table | Purpose |
|---|---|
| `levels` | CEFR levels, ordered, PRE_A1 active |
| `courses` | Courses, unique code, level FK, lifecycle status |
| `modules` | Ordered modules per course |
| `lessons` | Ordered lessons, objectives (JSON), duration, lifecycle status |
| `lesson_content_blocks` | Typed content blocks (type, order, JSON payload) |
| `vocabulary` | Lesson vocabulary with translations/phonetics/URLs |
| `grammar_content` | Lesson grammar concepts (patterns/examples as JSON) |
| `student_lesson_progress` | One row per student+lesson (unique constraint = no duplicates) |
| `course_assignments` | Course ↔ learning-group bridge (unique pair) |

## 3. New routes

- `/student/learning` — **My Learning** (was a placeholder, now the real course map)
- `/student/learn/[id]` — **lesson page** (authorization in `generateMetadata` so
  hidden lessons produce a real 404 — see Known issues)
- `/student/progress` — **My Progress** (real data, was a placeholder)
- `/admin/curriculum`, `/admin/curriculum/[courseId]` — read-only curriculum views

## 4. New components

`progress-bar` (ARIA progressbar + visible %), `lesson-status-icon` (icon + sr-only
text — status never color-only), content-block renderers (`content-blocks`),
`vocabulary-list`, `grammar-panel`, `question-block` (reveal answer),
`lesson-complete-button` (idempotent POST + optimistic UI + next-lesson CTA),
`lesson-access-tracker` (fire-and-forget activity), `lesson-footer-nav`
(sticky on mobile), `my-learning` (course/module/lesson map), `student-progress`,
rewritten `student-dashboard`. Admin: curriculum pages. Teacher: course line on
group cards.

## 5. New APIs

- `POST /api/lessons/[id]/access` — mark lesson accessed (upsert IN_PROGRESS)
- `POST /api/lessons/[id]/complete` — mark completed (idempotent, strict schema)

Both: session-scoped (no client-supplied student id is ever trusted), server-side
authorization via `canRecordProgress` (published + assigned to the caller's group),
zod-validated, origin-checked. Teacher/anonymous → 403/401 (verified).

## 6. Seed content created

"English Starter" (Pre-A1, PUBLISHED): Getting Started · Alphabet & Sounds ·
Basic Words · Basic Sentences · Numbers & Time · Everyday English — 25 lessons
matching the brief's curriculum, each with real objectives, duration, beginner
content, examples with Persian notes, practice questions, and vocabulary
(hello سلام /həˈloʊ/, book کتاب /bʊk/, fire station آتش‌نشانی …). All 7 CEFR levels
seeded; course assigned to all 5 groups.

## 7. Student learning flow (verified end-to-end)

Sign in → **Dashboard** shows level "Starter / Pre-A1", 0%, "Continue learning:
What is English?" → click → **lesson page** (objectives → content → vocabulary →
grammar → practice) → **Mark as complete** → row saved, dashboard recalculates to
4% (1/25), streak appears, recent-lessons list fills → **Next lesson** → My Learning
shows ✓ completed / ▶ in progress / "Start here" recommendation → **My Progress**
shows per-module bars. Empty states everywhere when there is genuinely no data.

## 8. Security checks (all executed)

- Student cannot open DRAFT lessons, unpublished modules/courses, INACTIVE levels,
  or lessons of courses **not assigned to their group** (API: true 404; page: never
  renders content, verified byte-level no-leak tests with secret-marked fixtures).
- Progress APIs ignore forged `studentId`/`userId` (strict schema rejects them;
  rows are always keyed to the session user — verified owner check).
- Strict schema: unknown body fields → 422; `timeSpentSec` range-validated.
- Cross-student isolation: two students completing the same lesson produce two
  independent rows; dashboards show different real percentages.
- Teacher → 403 on progress APIs; anonymous → 401.
- Phase 1 authorization matrix re-verified (student↛admin/teacher, admin full,
  group/user APIs intact).

## 9. Responsive checks

Mobile-first lesson layout (max-w-3xl, fluid), sticky bottom prev/next bar on
mobile, comfortable ≥44px touch targets, vocabulary cards collapse to one column,
tables only in admin views with card fallbacks, no fixed pixel widths (verified),
viewport meta everywhere, dashboard/My Learning reflow from 360px up. A11y:
progressbar roles with values, sr-only status text, semantic headings, labelled
controls, visible focus rings.

## 10. Known issues

1. **HTTP status on hidden lesson pages** — the page renders the proper not-found
   screen but with status 200 instead of 404. Cause: React SSR streaming flushes
   the shell before a nested page's `notFound()` executes (documented Next.js App
   Router behavior with async layouts). Content protection is byte-verified; APIs
   return true 404s; fixing the page status would require restructuring the Phase 1
   auth layout, so it is intentionally accepted. `notFound()` is still used (it is
   correct for client-side navigation).
2. **Audio/video** — block types and renderers exist; no seed content uses them
   (no real media files yet, and we never fake players).
3. **Time-on-lesson** is best-effort client-measured visible time, clamped to 2h.
4. Persian translations are machine-drafted for common beginner words; a human
   reviewer should proof them before production use.
5. Multi-course dashboards show the most-progressed course as "active"; course
   switching UI arrives with course assignment management (Phase 3).

## 11. Recommended next phase (Phase 3)

1. **Teacher/admin content builder** — author levels, courses, modules, lessons and
   blocks (the block schema is ready), with DRAFT→PUBLISH workflow.
2. **Course assignment management UI** (admin assigns courses to groups).
3. **Graded practice/quizzes** on top of the QUESTION system, feeding real scores.
4. Then: A1 level content, scheduling/attendance, notifications.

**Stopped here as instructed — no Phase 3 work started.**
