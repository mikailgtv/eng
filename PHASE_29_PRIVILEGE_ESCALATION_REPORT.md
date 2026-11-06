# Phase 29 — Privilege Escalation Report

**Status:** Potential critical escalation paths found statically; no live role tampering performed.

## P29-001 — CRITICAL candidate: arbitrary SUPER_ADMIN assignment / base-role promotion
- `POST /api/roles` accepts `action=assign`, `userId`, `roleKey`, optional scope fields.
- `assignAccessRole` requires `roles.manage`, but does not prove target belongs to actor's organization or restrict SYSTEM roles such as `SUPER_ADMIN`.
- The service selects the role from first organization and invokes `syncBaseRole`, which sets `User.role` to ADMIN when any assigned role has `baseRole=ADMIN`.
- The `SUPER_ADMIN` system role includes every permission. No independent elevation approval or two-person rule was found in this path.
- Real request/exploit and role state are NOT TESTED. Treat as unresolved CRITICAL until remediation and staging regression evidence.

## Other observations

- `createCustomRole` lets a `roles.manage` actor define a custom role with a base role and permission keys; service filters through known permissions but does not enforce permission ceilings or actor's scope.
- `grantTemporary` does not visibly validate target user organization, allowed permission ceiling, or maximum duration; dates are parsed but no max interval is enforced.
- `createDelegation` does not visibly verify that delegator, recipient, delegated role and resource scope belong to a common tenant or that actor can delegate the requested permission.
- Support impersonation requires permission/reason and records audit; time is capped at 30 minutes, but no live proof/session tests were performed.

**Remediation:** disallow direct assignment of `SUPER_ADMIN`; require independently provisioned break-glass workflow, MFA/re-auth, dual approval and audit; bind actor, target, role and scope to same organization in atomic server-side checks; prohibit privilege above actor's delegable ceiling; add constrained schema validation and audit tests.
