# Phase 1 — Implementation Report

**Project:** EnglishBridge LMS — organizational English training platform
**Scope:** Foundation only (no course engine, no AI tutor, no fake functionality)
**Status:** ✅ Implemented, built, and verified

---

## 1. Architecture used

- **Next.js 14 App Router + TypeScript** — one modular full-stack codebase:
  React Server Components fetch data directly through a centralized query
  layer (`src/lib/queries.ts`); mutations go through protected Route Handlers
  (`/api/*`) with centralized error handling and validation.
- **Prisma ORM** — dev database SQLite (`prisma/dev.db`); the schema avoids
  provider-specific features, so production PostgreSQL is a one-line provider
  switch plus `DATABASE_URL`.
- **Session auth** — bcryptjs (12 rounds) + `jose`-signed HS256 JWT in an
  httpOnly/SameSite=Lax/Secure cookie. Stateless edge verification in
  middleware **plus** DB re-validation per request (authoritative).
- **Tailwind CSS design system** — semantic tokens in `globals.css` mapped in
  `tailwind.config.ts`; reusable primitives under `src/components/ui`.
- **zod** — shared client/server validation schemas (`src/lib/validations.ts`).
- No existing project was found in the workspace (empty directory), so the
  stack above was chosen per the brief.

## 2. Database tables created

| Table | Purpose | Key fields / relations |
|---|---|---|
| `users` | All accounts (3 roles) | employeeCode·username·email unique, passwordHash, role, status, englishLevel (nullable CEFR), groupId → `learning_groups`, timestamps, lastLoginAt |
| `learning_groups` | Organizational learning groups | name unique, **open `type` registry** (FIREFIGHTER_SHIFT, DAY_WORKER — extensible without migration), description, status, optional lead `teacherId` → `users` |
| `audit_logs` | Administrative action trail | actorId → users, action, entityType/Id, non-sensitive JSON metadata, ip, createdAt |

Deliberately **not** created yet (per brief): courses, lessons, attendance,
exams, notifications, AI conversations. The `englishLevel` field and the
profile/dashboard component structure already reserve space for them.
`users.groupId` is the user↔group relationship (a student belongs to exactly
one group; teachers relate to groups via `learning_groups.teacherId`).

## 3. Routes created

**Pages** — `/login`, `/` (session router), `/dashboard` (role alias → role home),
`/unauthorized` (403), global 404 + error boundary.
STUDENT: `/student` (dashboard), `/student/profile`, `/student/{learning,schedule,exams,progress}` (honest future-phase states).
TEACHER: `/teacher`, `/teacher/groups`, `/teacher/students`, `/teacher/students/[id]`, `/teacher/{classes,courses,exams,attendance,reports}`.
ADMIN: `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/teachers`, `/admin/students`, `/admin/groups`, `/admin/groups/[id]` (member management), `/admin/settings` (system info + audit log), `/admin/reports`.

**API** — `POST /api/auth/login`, `POST /api/auth/logout`,
`POST /api/users`, `PATCH /api/users/[id]`,
`POST /api/groups`, `PATCH /api/groups/[id]`,
`POST|DELETE /api/groups/[id]/members`, `GET /api/groups/[id]/available-students`.
All mutations: zod-validated, role-guarded, origin-checked, audited.

## 4. Authentication approach

Credentials (username **or** email) + bcrypt verification → signed JWT cookie
(7 d, httpOnly). Generic login errors + per-IP/identifier rate limiting
(5 failures / 5 min) prevent enumeration/brute force. The token stores only
`sub`, `role` (for routing) and a **password-version fingerprint** — every
request re-reads the user from the DB and rejects the session if the account
is deactivated, the role token is stale, or the password changed. Verified:
deactivating a user kills their live session on the very next request.

## 5. Authorization approach

Three independent layers, DB-backed one is authoritative:
1. **Edge middleware** — coarse redirects/401-403 JSON (fast fail).
2. **Layout guards** (`requirePageUser`) — every role workspace revalidates.
3. **API guards** (`requireApiUser([roles])`) — every handler.

Matrix (verified end-to-end): STUDENT ✗ admin ✗ teacher pages; TEACHER ✗ admin
pages; ADMIN → full access; anonymous → login. Teacher student-profile access
is additionally scoped to *students in groups the teacher leads* (verified
cross-group leak attempt is blocked, search included). Admin self-deactivation
and last-admin demotion are blocked server-side.

## 6. Components created

**UI kit:** Button, Input/Select/Textarea/Label/FormField/FormError, Card set,
Badges (role/status/level/group-type), Avatar, Dialog + ConfirmDialog,
Toast provider, EmptyState/EmptyInline, Spinner/PageLoader/Skeleton, StatCard,
PageHeader, Pagination, SearchInput, NavLink, Brand.
**Layout:** AppShell (desktop sidebar + mobile drawer redesign), UserMenu.
**Domain:** three dashboards, shared StudentProfile (3 viewers), user
management suite (shared UsersPage for all-users/teachers/students, form
dialog with confirm flows, row actions, filters, responsive table→cards),
group management (cards, form dialog, MembersManager with move/remove
confirmations), ComingSoon placeholder, LoginForm.

## 7. Verification results (all executed against the running build)

- Authentication: 13/13 ✓ (login all roles, persistence, logout, redirects)
- Role route protection: 8/8 ✓ · API authorization: 6/6 ✓
- User management API: 13/13 ✓ (create, validation 422, dup 409 friendly,
  role change, soft deactivate, login blocked, mid-session revocation,
  password reset, self-deactivation + last-admin guards)
- Group management API: 10/10 ✓ (CRUD, assign/move/remove member,
  duplicate 409, invalid type/teacher 422, deactivate)
- Audit trail: ✓ all 10 action types written; no secrets in log
- Rate limiting: ✓ 429 after 5 failures
- Page sweep: 26 routes × roles all 200; 404/403 pages correct
- Teacher scoping: ✓ cross-group profile/search blocked
- `tsc --noEmit` clean · `next build` clean · server log: zero errors

Two initial "failures" during verification were traced to bugs in my test
script (bash readonly `UID`, stale JSON fixture) — **not** app defects; the
accidental DB mutations they caused were rolled back and the app's guards
actually behaved correctly. One real improvement found & fixed: `/dashboard`
now redirects with a proper 307 in middleware instead of a streamed
client-side redirect.

## 8. Known limitations

1. **SQLite dev database** — fine for Phase 1; switch Prisma provider to
   PostgreSQL for production (schema is already portable).
2. **In-memory login rate limiter** — per-instance; move to Redis when
   horizontally scaling.
3. **Role change takes effect on next request** — by design (DB check);
   no live push needed.
4. Future-phase nav items show honest "planned" pages (routes exist; no
   fake features). Student "progress" data structures are placeholders by
   spec — clearly empty states, no fabricated data.
5. No dark mode, no i18n (English-only UI), no email sending yet.
6. Session fixation/rotation on login re-issues the token but absolute 7-day
   expiry; sliding sessions can be added later.

## 9. Issues found during verification

- Test-script issues only (readonly `UID`, stale fixture, curl redirect-URL
  formatting). Application defects found: 1 (dashboard redirect served 200
  via RSC streaming) — fixed in middleware and re-verified (307).
- Server log across all tests: no errors, no stack traces.

## 10. Recommended next phase (Phase 2)

1. **Course/lesson engine:** `courses → modules → lessons` tables + authoring
   UI (admin/teacher), lesson types (vocabulary, grammar, listening, speaking).
2. **Assignment of courses to groups** and **student progress tracking**
   (lesson completion, scores) — the empty states already anticipate this.
3. Teacher class scheduling + attendance (schema hooks reserved).
4. Then: quizzes/exams, notifications, analytics reports, and the AI tutor.

**Not** started on purpose: any learning content — Phase 1 stays a stable
foundation.
