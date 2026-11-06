# Phase 26 — Release Rollback Plan

**Status: designed, not tested against a deployment.** No known-good remote deployment or production database exists in the workspace, so an actual rollback cannot be performed here.

## Application release rollback
1. Detect: external `/health`/`/ready`, error/latency alerts or failed authenticated smoke.
2. Stop: freeze further promotion and risky background automation; preserve logs/deploy IDs and avoid deleting data.
3. Decide: compare app artifact, migration ID and active DB schema. Revert only to an app version compatible with current schema.
4. Roll back: deploy the previous immutable artifact through provider control plane; keep current DB unless the issue is explicitly data corruption and owner approves recovery.
5. Verify: readiness, public health, login, role routing, student learning, teacher session/attendance, homework/assessment and admin health. Monitor for recurrence.
6. Document incident and corrective action; resume only after owner approval.

## Database changes
- Use expand/contract migrations so previous app version remains schema-compatible through rollback window.
- Prefer a forward fix for additive migration issues. Do not use `prisma db push` or destructive reverse SQL in production.
- For irrecoverable data damage: freeze writes; preserve current DB; restore backup/PITR to a new target; validate row counts/FKs/business invariants and object storage; reconcile transactions since snapshot; obtain owner approval before switching the connection.
- Never restore over the only source copy. Never use `prisma/dev.db` or its post-change snapshot as a production recovery source.

## Rollback evidence to capture
Release/commit ID, old/new artifact IDs, migration hash, backup/PITR point ID, incident start, owner/approver, smoke results, data-loss analysis, and recovery timing. Do not include connection strings, user PII or secrets in incident notes.

## Go-live gate
Before release, rehearse app rollback and schema-compatible rollback on Staging, including worker/API compatibility and object storage references. Until then the rollback plan is documented but not operationally tested.