# Phase 29 — IDOR Report

**Dynamic ID substitution:** NOT TESTED. No real STAGING target, backup verification, or test accounts were available.

## Findings

### P29-001 — CRITICAL candidate: role grant accepts arbitrary target IDs
- **Affected route:** `POST /api/roles` (`action=assign`)
- **Component:** `src/app/api/roles/route.ts`; `assignAccessRole` / `syncBaseRole`
- **Scenario:** An authenticated actor with `roles.manage` submits another tenant's `userId` and `roleKey=SUPER_ADMIN`. The service checks neither target organization nor allowed role-escalation ceiling; it inserts the role and synchronizes core base role.
- **Evidence:** Static source shows `userId` and `roleKey` forwarded directly; role is selected from `ensureIdentity()`'s first organization; `syncBaseRole` promotes based on the assigned role's `baseRole`.
- **Impact:** Potential arbitrary ADMIN promotion, all-permission grant, and cross-tenant escalation.
- **Status:** NOT TESTED; do not claim exploit confirmed by request.

### P29-002 — CRITICAL candidate: `/api/organizations` IDOR / cross-org exposure
- **Affected routes:** `GET /api/organizations`; `PATCH /api/organizations`
- **Scenario:** `organizations.manage` actor reads all organizations or patches a supplied organization ID outside their scope.
- **Evidence:** `listOrganizations` returns `organization.findMany()` without a scope predicate; `updateOrganization(actor,id,input)` performs update by client-provided ID after unscoped `requirePermission`. `scopeMatches` treats organization grants as matching any organization.
- **Impact:** Cross-tenant exposure of settings/user counts and ability to alter security policy (MFA/password/lockout/session settings).
- **Status:** NOT TESTED on STAGING.

### P29-003 — HIGH candidate: assessment owner/group scope absent
- **Affected routes:** `GET/PATCH /api/assessments/{id}`, `PUT /api/assessments/{id}/questions`
- **Scenario:** Any TEACHER with a valid assessment identifier can query staff detail (including option `isCorrect`), modify assessment fields/status, or replace question list; route checks broad role and existence but does not check course assignment/assigned group.
- **Impact:** Other teacher's restricted exam content and answer key exposure, assessment tampering.
- **Status:** Static route evidence only; request-level abuse NOT TESTED.

### P29-004 — MEDIUM/HIGH candidate: content media owner/scope check absent
- **Affected route:** `GET /api/content/media/{id}`
- **Evidence:** `readContentMedia` loads by media ID and denies only role `STUDENT`; it does not check uploader, course/lesson publication, teacher assignment, organization, or item visibility. `ContentMedia` has no organization FK in the inspected schema.
- **Impact:** Any authenticated non-student may retrieve files if the ID is known; privacy impact depends on intended library visibility.
- **Status:** NOT TESTED; classification remains candidate pending product visibility rules.

## Required staging matrix

For each resource family (profile, progress, completion, assignment/submission, attempt/score, attendance, certificate, notification, message/attachment, AI/voice, group/course/media, report/export), execute own ID, peer ID, unassigned teacher ID, foreign organization ID, and nonexistent ID. Expected unauthorized result 403/404 and no database side effect; all outcomes currently NOT TESTED.
