# Phase 26 — Disaster Recovery Plan

**Operational status: not yet measurable or approved.** Production provider, region, backup/PITR capability, object-storage policy, staffing and cutover architecture are unknown, so an achieved RPO/RTO cannot be asserted.

## Recovery objectives
| Objective | Current achieved value | Required action |
|---|---|---|
| RPO (maximum data loss) | **Unknown / not established**. No production backup cadence/PITR exists in the workspace. | Select DB provider/plan; document transaction durability and PITR window; agree business impact/cost with owner; test restore to a timestamp. |
| RTO (service recovery time) | **Unknown / not measured**. No production app/domain/database cutover test. | Measure database, object restore, secret recovery, app deploy and DNS/TLS cutover in Staging, including approval and staffing. |

Phase 21's DR report offered a candidate **24-hour RPO / 1 business day RTO** for a future initial managed service, explicitly as a recommendation, not a guarantee. Phase 26 does not promote those numbers to commitments; owner/provider validation is required.

## Recovery scenarios
- **Database unavailable/corrupt:** stop writes/automations; declare incident; preserve affected DB; choose approved timestamp/backup; restore into a new isolated DB; run schema/FK/business checks; test app and roles; only then switch the secret/connection and reopen writes.
- **Bad app release:** freeze promotion; route to last known-good immutable app artifact only if schema-compatible; keep database state; run readiness/auth smoke. Avoid blind DB rollback.
- **Destructive migration/data issue:** stop writes; preserve logs and source DB; determine whether forward repair or point-in-time restore is safer; obtain owner approval; reconcile writes since backup to avoid silently losing valid user work.
- **Object storage loss:** restore versioned objects to a new namespace; verify checksums, metadata, privacy/access rules and database references before switching storage config.
- **Secret compromise:** revoke/rotate affected key in secret manager, invalidate sessions/provider tokens as appropriate, assess logs for exposure, deploy no secrets in source/build artifacts.
- **Worker/provider outage:** disable only affected optional workflow through a tested server-side flag; preserve in-app learning and data operations; retry idempotently after recovery.

## Minimum recovery controls
- Separate admin accounts and break-glass procedure with audit.
- Encrypted managed DB backups/PITR and independent object backups; keys stored separately under controlled access.
- Deployment artifact and migration identifiers preserved for each release.
- Tested restore/runbook with owner, on-call and status communication.
- Quarterly or provider-appropriate restore drill cadence set after cost/staffing approval; alert on backup failure.

## Go-live blocker
Until a recent Staging backup is restored and measured end-to-end, RPO/RTO are **not specified**, disaster recovery is **not certified**, and production go-live remains blocked.