# Phase 29 — Tenant Isolation Report

**Architecture classification:** Multi-organization design is present (Organization, UserOrganization, organizationId fields, organization-scoped roles/workflows). The system cannot be documented as single-tenant.

**Cross-tenant runtime tests:** NOT TESTED. Tenant fixtures were not created; no destructive tests ran.

## Critical static findings

1. `src/lib/identity/permissions.ts` `scopeMatches` returns true for a grant with `scopeType === "ORGANIZATION"` without comparing `grant.scopeId` to requested `scope.id`. This is an organization boundary bypass in permission decisions. When no scope is supplied, it accepts any permission grant.
2. `ensureIdentity()` always selects the oldest/first organization and provisions system roles only there; it backfills unassigned users/groups into that one organization. `ensureUserAccess()` uses this org to choose user role grants without checking the user's organization. This is incompatible with reliable multi-organization provisioning.
3. `assignAccessRole`, `grantTemporary`, and delegation flows do not enforce actor-target common organization/scope in inspected service code.
4. `listOrganizations` and `updateOrganization` operate globally after a permission check lacking org scope.
5. Multiple teaching services use group assignment boundaries, but organization equality is not uniformly part of the check. Database RLS was not evidenced.

**Severity:** CRITICAL candidate(s) P29-001/P29-002. Cross-tenant leakage is not experimentally confirmed because STAGING is unavailable; source evidence is concrete and must be treated as unresolved until fixed and tested.

## Required tests

Create two isolated organizations, admin/teacher/student actors, groups and test records in STAGING. Test list/read/write/export for every data family from both orgs, including direct IDs, bulk operations, media, workflow, reports, permissions and role assignment. Verify no cross-org database changes. Backup verification is a prerequisite for destructive fixture/test activity; current status is NOT VERIFIED.
