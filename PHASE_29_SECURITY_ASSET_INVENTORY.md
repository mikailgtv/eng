# Phase 29 — Security Asset Inventory

**Status:** static inventory performed; runtime asset discovery and authentication behavior NOT TESTED (STAGING unavailable and current backup NOT VERIFIED).

| Asset type | Count / route | Access evidence | Notes |
|---|---:|---|---|
| App pages | 110 | Server components/layouts; `getSessionUser` / `requirePageUser` patterns checked statically | No browser session tests performed |
| API route files | 199 | 245 exported HTTP handlers inventoried in route matrix | Handler authorization semantics not runtime verified |
| Server actions | 0 files containing `use server` | Static grep | No server-action endpoint discovered by this scan |
| Webhooks | `/api/integrations/webhooks`, `/api/v1/webhooks` | Integration permission / HMAC signature code present | No live signature/replay tests |
| Upload endpoints | `/api/content/media`, `/api/messages/attachments` plus content/import endpoints | Session and role/service checks present in static code | File size/MIME/ownership tests NOT RUN |
| Download endpoints | `/api/content/media/{id}`, `/api/messages/attachments/{id}`, `/api/certificates/download/{token}`, `/api/certificates/transcript` | Auth/helper checks vary; details in file report | No IDOR request tests |
| Health/readiness | `/health`, `/ready` | Public routes return coarse healthy/unavailable and ready true/false; no diagnostics | Response reachability/accessibility NOT tested |
| Internal worker | `/api/internal/workflow-worker` | Static bearer-secret comparison | Secret provisioning/status NOT VERIFIED; no invocation |
| Public-ish flows | `/api/auth/login`, `/api/auth/clear-session`, `/api/invitations/accept`, `/api/verify/certificate/{code}` | Login/invitation/token/public verification flow | Public disclosure/rate-limit behavior not dynamically tested |
| Public static files | 15 | `public/` assets | Includes two phase demo HTML suites; their static mock DOM is not authenticated LMS data |

## App page inventory

| Page | Route-group access evidence |
|---|---|
| `/admin` | admin page/guard review required |
| `/admin/access-reviews` | admin page/guard review required |
| `/admin/account` | admin page/guard review required |
| `/admin/ai` | admin page/guard review required |
| `/admin/announcements` | admin page/guard review required |
| `/admin/audit` | admin page/guard review required |
| `/admin/automation` | admin page/guard review required |
| `/admin/books` | admin page/guard review required |
| `/admin/certificates` | admin page/guard review required |
| `/admin/content` | admin page/guard review required |
| `/admin/curriculum` | admin page/guard review required |
| `/admin/curriculum/{courseId}` | admin page/guard review required |
| `/admin/departments` | admin page/guard review required |
| `/admin/gamification` | admin page/guard review required |
| `/admin/groups` | admin page/guard review required |
| `/admin/groups/{id}` | admin page/guard review required |
| `/admin/invitations` | admin page/guard review required |
| `/admin/learning` | admin page/guard review required |
| `/admin/learning-levels` | admin page/guard review required |
| `/admin/messages` | admin page/guard review required |
| `/admin/notifications` | admin page/guard review required |
| `/admin/organization` | admin page/guard review required |
| `/admin/reports` | admin page/guard review required |
| `/admin/roles` | admin page/guard review required |
| `/admin/security` | admin page/guard review required |
| `/admin/settings` | admin page/guard review required |
| `/admin/settings/integrations` | admin page/guard review required |
| `/admin/students` | admin page/guard review required |
| `/admin/system-health` | admin page/guard review required |
| `/admin/teachers` | admin page/guard review required |
| `/admin/users` | admin page/guard review required |
| `/admin/users/{id}` | admin page/guard review required |
| `/admin/voice` | admin page/guard review required |
| `/dashboard` | public/neutral; per-page review required |
| `/invite/{token}` | public/neutral; per-page review required |
| `/login` | public/neutral; per-page review required |
| `/notifications` | public/neutral; per-page review required |
| `/page.tsx` | public/neutral; per-page review required |
| `/reset-password/{token}` | public/neutral; per-page review required |
| `/student` | student page/guard review required |
| `/student/achievements` | student page/guard review required |
| `/student/announcements` | student page/guard review required |
| `/student/assignments` | student page/guard review required |
| `/student/assignments/{id}` | student page/guard review required |
| `/student/certificates` | student page/guard review required |
| `/student/exams` | student page/guard review required |
| `/student/exams/{id}` | student page/guard review required |
| `/student/exams/{id}/result` | student page/guard review required |
| `/student/exams/{id}/take` | student page/guard review required |
| `/student/learn/{id}` | student page/guard review required |
| `/student/learning` | student page/guard review required |
| `/student/listening` | student page/guard review required |
| `/student/messages` | student page/guard review required |
| `/student/notifications` | student page/guard review required |
| `/student/notifications/preferences` | student page/guard review required |
| `/student/plan` | student page/guard review required |
| `/student/profile` | student page/guard review required |
| `/student/progress` | student page/guard review required |
| `/student/review` | student page/guard review required |
| `/student/schedule` | student page/guard review required |
| `/student/security` | student page/guard review required |
| `/student/speaking` | student page/guard review required |
| `/student/speaking/history` | student page/guard review required |
| `/student/training-record` | student page/guard review required |
| `/student/tutor` | student page/guard review required |
| `/student/tutor/history` | student page/guard review required |
| `/teacher` | teacher page/guard review required |
| `/teacher/ai` | teacher page/guard review required |
| `/teacher/announcements` | teacher page/guard review required |
| `/teacher/assignments` | teacher page/guard review required |
| `/teacher/assignments/new` | teacher page/guard review required |
| `/teacher/assignments/{id}` | teacher page/guard review required |
| `/teacher/attendance` | teacher page/guard review required |
| `/teacher/books` | teacher page/guard review required |
| `/teacher/certificates` | teacher page/guard review required |
| `/teacher/classes` | teacher page/guard review required |
| `/teacher/classes/{id}` | teacher page/guard review required |
| `/teacher/content` | teacher page/guard review required |
| `/teacher/content/builder/{id}` | teacher page/guard review required |
| `/teacher/content/course/{id}` | teacher page/guard review required |
| `/teacher/content/library` | teacher page/guard review required |
| `/teacher/content/preview/{id}` | teacher page/guard review required |
| `/teacher/courses` | teacher page/guard review required |
| `/teacher/courses/lessons/{id}` | teacher page/guard review required |
| `/teacher/engagement` | teacher page/guard review required |
| `/teacher/exams` | teacher page/guard review required |
| `/teacher/exams/blueprint` | teacher page/guard review required |
| `/teacher/exams/new` | teacher page/guard review required |
| `/teacher/exams/reviews` | teacher page/guard review required |
| `/teacher/exams/{id}` | teacher page/guard review required |
| `/teacher/groups` | teacher page/guard review required |
| `/teacher/groups/{id}` | teacher page/guard review required |
| `/teacher/learning` | teacher page/guard review required |
| `/teacher/learning/{studentId}` | teacher page/guard review required |
| `/teacher/listening` | teacher page/guard review required |
| `/teacher/messages` | teacher page/guard review required |
| `/teacher/notifications` | teacher page/guard review required |
| `/teacher/plans` | teacher page/guard review required |
| `/teacher/questions` | teacher page/guard review required |
| `/teacher/questions/new` | teacher page/guard review required |
| `/teacher/questions/{id}` | teacher page/guard review required |
| `/teacher/reports` | teacher page/guard review required |
| `/teacher/results` | teacher page/guard review required |
| `/teacher/results/{attemptId}` | teacher page/guard review required |
| `/teacher/security` | teacher page/guard review required |
| `/teacher/speaking` | teacher page/guard review required |
| `/teacher/students` | teacher page/guard review required |
| `/teacher/students/{id}` | teacher page/guard review required |
| `/unauthorized` | public/neutral; per-page review required |
| `/verify/certificate/{code}` | public/neutral; per-page review required |

## API route/method inventory

See the complete method-level inventory in `PHASE_29_ROUTE_AUTHORIZATION_MATRIX.md` (all route files under `src/app/api`). Dynamic path segments are represented with braces.

## Scope limits

No externally deployed host, DNS, reverse proxy, cloud object bucket, provider console, webhook sender, or browser bundle from a staging build was available for discovery. Do not interpret repository inventory as a complete network asset inventory. No credentials or environment values were recorded.
