# PHASE 32 — Security Matrix

**Date:** 2026-10-25
**Scope:** EnglishBridge LMS (`/home/user`), 213 Prisma models, 205 API routes.
**Method:** every row was checked against the actual route handler and verified with a live HTTP request (see `PHASE_32_IDOR_TEST_RESULTS.md`). No row is marked protected on the basis of a code pattern alone.

## Tenant model (authoritative)

- **Boundary = `Organization.id`.**
- Direct: `User.organizationId`, `LearningGroup.organizationId`, `Level.organizationId`, `Department.organizationId`, `Team.organizationId`, `ContentMedia.organizationId` (added Phase 32).
- Derived: `Course` → `Level.organizationId`; `Lesson` → `Module` → `Course`; `Assessment` → `Course` → `Level` / `Level` / `Module`; `Assignment`, `ClassSession`, `AttendanceRecord` → `Group.organizationId`; `MessageAttachment` → `Message.sender.organizationId`.
- **`Course`, `Lesson`, `Assessment`, `Assignment`, `ClassSession` have no `organizationId` column** — their tenant must be derived. This is the main structural risk (see Schema gaps).
- Platform-wide exception: role key `SUPER_ADMIN` only. Narrow, explicit, and audited (`CROSS_TENANT_ACCESS`, `TENANT_UNSCOPED_RECORD_ACCESS` audit rows, verified present after the live run).

## Resource matrix

| Resource | Tenant owner | Allowed roles | Operations | Server-side authorization | Live test | Risk |
|---|---|---|---|---|---|---|
| User profile / learner record | `User.organizationId` | ADMIN (own org), TEACHER (own groups), self | read, update | `userInScope` + `userDetail`; `assertTenant` | L02, L03, L13 / **D01–D04** | Previously any org grant reached all tenants → **fixed** |
| Organization settings | `Organization.id` | ADMIN (own org) | read, update | `listOrganizations`, `updateOrganization` (`requirePermission` with org scope) | L04 / D05, D06 | OK |
| Class / group | `LearningGroup.organizationId` | ADMIN (own org), TEACHER (assigned) | read, update, members | `assertTenant` in `PATCH /api/groups/[id]` | L12 / **D07, D08** | Missing check → cross-tenant rename **fixed** |
| Course / content | `Course → Level.organizationId` | ADMIN (own org), TEACHER (assigned/author) | read, edit, export | `canEditCourse` + `assertTenant` + `assertCourseEdit` | L14 / **D13, D14** | ADMIN bypassed tenant → **fixed** |
| Lesson + progress | `Lesson → Course → Level` | STUDENT (own, released), TEACHER (assigned), ADMIN | read, record progress | `canRecordProgress`, `studentContentGate`, `studentCanAccessCourse` | L08 / D15 | OK |
| Exam / assessment builder | `Assessment → Course/Level/Module` | TEACHER (assigned course), ADMIN (own org) | read, update | `assertAssessmentAccess` + `assignedGroupIds` | L11 / D09, **D10** | `viewer.organizationId` was always `undefined` → **fixed** |
| Homework assignment | `Assignment → Group.organizationId` | TEACHER (assigned), ADMIN | publish, review, submit | `assertAssignmentAccess` / group scope in `teaching/service` | L10 / D11 | OK |
| Attendance | `ClassSession → Group.organizationId` | TEACHER (assigned), ADMIN | write, change | `assertSessionAccess` in `saveAttendance` | L09 / D12 | OK |
| Private message + attachment | `Conversation` participants + `sender.organizationId` | participants only | send, read, download | `readAttachment` participant + tenant check (fails closed on NULL tenant) | L06 / D18, D19 | OK |
| Content media / audio | `ContentMedia.organizationId` | TEACHER, ADMIN (own org); never STUDENT | upload, download, delete | `saveContentMedia` derives org from actor; `readContentMedia` tenant check fails closed | L05 / D16, D17 | OK (legacy NULL rows now denied) |
| Backup metadata / create / restore | platform (no `organizationId`) | ADMIN only (`requireApiUser(["ADMIN"])`) | create, list, verify, restore drill | route-level role gate + restore-target validation | L07 / D24–D27 | Any tenant's ADMIN can back up the shared DB — **accepted risk**, see final report |
| Roles / grants | `AccessRole.organizationId` | ADMIN (own org), never self | assign, revoke | `assignAccessRole` (SUPER_ADMIN guard, target/scope validation) | D21, D22, D30 | OK |
| Temporary permissions | `TemporaryPermission` | ADMIN (`roles.manage`) | grant | `grantTemporary` + `requirePermission` | D23 | OK |
| Bulk user ops | `User.organizationId` | ADMIN (own org) | suspend, activate, role, group, notify | `filterUsersInTenant` **before** any branch | D28 | Previously unscoped `updateMany` → **fixed** |
| User creation | `User.organizationId` | ADMIN (own org) | create | org taken from actor, never the request body | D29 | Previously first-org → **fixed** |
| Unauthenticated access | — | none | any | `requireApiUser` → 401 | D31–D34 | OK |

## New authorization helper

`src/lib/identity/tenant.ts` (new) is now the single place that answers "may this actor act on this record's tenant":

```
assertTenant(actor, targetOrgId, context)
  own === target            -> allow
  target unknown (null)     -> allow only when the deployment has 1 organization
                               (otherwise deny 404; SUPER_ADMIN allowed + audited)
  own !== target            -> deny 404, unless SUPER_ADMIN (audited CROSS_TENANT_ACCESS)
```
`courseOrgId`, `groupOrgId`, `filterUsersInTenant`, `actorOrgId`, `isSuperAdmin` sit alongside it.

Denials return **404** (not 403) so the existence of another tenant's record is not disclosed.

## Schema gaps discovered (not silently fixed)

1. `Level.code`, `LearningGroup.name`, `LearningGroup.code`, `Course.code` are **globally unique**, so two tenants cannot both own "A1" or "Class A". Blocks multi-tenant operation (functional, not a leak). Minimal migration would be `@@unique([organizationId, code])` — **not applied**, it would rewrite unique indexes on live tables.
2. `Course`/`Lesson`/`Assessment`/`Assignment`/`ClassSession` carry no tenant column — every check must derive it (extra queries, easy to forget). A nullable `organizationId` backfilled from the parent would make checks cheap and total.
3. `ContentMedia.organizationId` is nullable by design (uncertain ownership is never auto-assigned), so the read path now **fails closed** when more than one organization exists.
