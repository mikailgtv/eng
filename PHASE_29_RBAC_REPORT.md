# Phase 29 — RBAC Report

**Status: NOT VERIFIED dynamically.** No test accounts or reachable STAGING database were available.

## Role model observed

- Core `User.role`: `STUDENT`, `TEACHER`, `ADMIN` (`src/lib/constants.ts`, schema). This drives primary page/API guards. There is no core `MANAGER` or `SUPER_ADMIN` enum role.
- Secondary permission roles include `SUPER_ADMIN` (all catalog permissions), `ORGANIZATION_ADMIN` (all except impersonation), `TRAINING_ADMIN`, `REVIEWER`, `TEACHER`, `ASSISTANT_TEACHER`, `STUDENT`, `VIEWER` (`src/lib/identity/catalog.ts`). They retain a core `baseRole`. Custom permissions are deny-by-default at the catalog level, but `SUPER_ADMIN` is explicitly an all-permission role.
- Existing API endpoints commonly gate only the broad core role and rely on service-level scope helpers for group ownership. The dynamic RBAC mapping from a permission role to every route is NOT VERIFIED.

## HIGH/CRITICAL source findings

- **CRITICAL candidate — cross-tenant role escalation:** `assignAccessRole` accepts arbitrary target `userId` and `roleKey`, selects a role from the first organization returned by `ensureIdentity()`, does not validate target membership in the actor's organization or restrict assignable roles, then `syncBaseRole` can set the target core role to `ADMIN`. See finding `P29-001` in the final report. Runtime exploit NOT TESTED.
- **CRITICAL candidate — organization scope bypass:** `scopeMatches()` returns true for every `ORGANIZATION` grant regardless of `grant.scopeId`; when no scope is supplied it returns true for any grant. Organization management services also use unscoped `requirePermission` and accept a client organization ID. See `P29-001`/`P29-002`.
- `/api/roles` POST action dispatch and service guards are permission-based, but no target-org check is visible in `assignAccessRole`, `grantTemporary`, or `createDelegation`; the endpoints require auth and same-origin on mutation.
- Explicit deny tests for Student→Teacher/Admin, Teacher→Admin and Admin→Super Admin were **NOT TESTED**.

## Authorization matrix (static expectation, not test outcome)

| Actor | Own learner record | Other learner | Assigned group | Unassigned group | Org management | Global super-admin grant |
|---|---|---|---|---|---|---|
| STUDENT | owner-only expected | deny expected | own learning only | deny expected | deny expected | deny expected |
| TEACHER | own + assigned learners | deny expected | allowed by helper | deny expected | deny expected | deny expected |
| ADMIN | broad legacy app-level access | broad in current services | broad | broad | permission scoped by design but scope flaw found | explicit secondary role exists |
| MANAGER | no core role; custom base-role only | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| SUPER_ADMIN | secondary permission role; base ADMIN | effectively broad permission catalog | broadly granted | broadly granted | all catalog permissions | no independent safeguards verified |

These are source-design expectations only. Because the source contains potential cross-tenant authorization defects, no row is marked PASS.
