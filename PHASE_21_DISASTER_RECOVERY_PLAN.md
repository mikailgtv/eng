# Phase 21 — Disaster Recovery Plan

**Current status:** recovery is not operationally certified. There is one local SQLite file and a post-change snapshot; no scheduled remote backups or verified Netlify staging environment were found.

## Current RPO / RTO (facts, not objectives)

| Component | Current RPO | Current RTO | Confidence |
|---|---|---|---|
| Local SQLite | Unknown/unbounded between manual copies; current snapshot only captures state after the Phase 20 writes | Not measured; copy/restore is quick for this 4.5 MB file, but application cutover and validation are untested | Low; no scheduled backup/restore SLA. |
| Uploaded files | No durable external storage/backup was verified | Not established | Low. |
| Netlify deployment | No verified active staging project/configuration in workspace | Not established | Low. |
| Third-party AI/speech/email/SMS | Provider-specific | Not established | No external credentials/status verified. |

**Recommended initial objectives after infrastructure setup (not guarantees):** daily verified backups with 24-hour maximum target RPO for the initial managed service; 1 business day target RTO for a database restore and app cutover. Set stricter objectives only after provider capabilities, point-in-time recovery, staffing and measured restore tests justify them. The current architecture does not meet or prove these objectives.

## Recovery runbooks

### Database corruption or accidental deletion
1. Stop writes and disable scheduled workers; preserve current DB and logs read-only.
2. Determine affected environment and last known-good backup; confirm backup timestamp, encryption and hash.
3. Restore to a new isolated DB; run schema/FK/integrity and business-level checks.
4. Start the previously known-good app build against the restored DB; verify auth and representative learning/exam/certificate records.
5. Get data owner approval, switch connection through secret store, smoke test and monitor.
6. Keep damaged DB and snapshot under restricted access until reconciliation is complete; no blind rollback of later valid transactions.

### Bad deployment / broken frontend or backend
1. Stop promotion and traffic to the candidate.
2. Roll back to last known-good Netlify deploy (once actual Netlify contexts are verified).
3. Do not roll back the database automatically. Use additive forward-compatible migrations; restore DB only for data corruption, after impact analysis.
4. Validate `/health`, login and core student/teacher/admin paths; capture build/deploy IDs and request references.

### Credential leak
1. Revoke/rotate compromised provider credential in the provider console and secret manager.
2. Rotate `SESSION_SECRET` only with a session invalidation plan; revoke active sessions/raise `sessionVersion` as needed.
3. Rotate `INTEGRATION_SECRET_KEY` with a credential re-encryption plan; do not replace it blindly if persisted integrations depend on it.
4. Review audit/security events, login attempts and webhooks; remove exposed artifacts from source/build history where possible.
5. Notify the data/security owner according to policy; preserve forensic logs without copying secrets.

### Storage failure
1. Disable uploads/attachment actions rather than accepting nondurable files.
2. Restore objects to a new bucket/namespace from versioned backup; verify checksums and ownership metadata.
3. Reconcile DB storage keys with restored objects; do not show missing assets as successful uploads.
4. Re-enable only after read/write and permission probes pass.

### Netlify failure
1. Use provider status and deployment state; avoid moving DNS until target and certificates are known.
2. Redeploy the last known-good immutable build to an independent supported host only if its DB/secrets/storage are available.
3. Preserve the original domain and environment variables securely; do not copy production secrets to preview contexts.
4. Restore DNS after application health and authentication checks.

### Third-party provider outage
- AI tutor: use the existing built-in fallback where available; return a temporary-unavailable message for unimplemented routes, retain no false success.
- STT/TTS: preserve typed/text alternatives where available; do not claim speech was processed if provider timeout occurred.
- Email/SMS/push: keep delivery status and retry with capped exponential backoff; show queued/failed state rather than sent unless provider confirms.
- Apply request timeout/circuit breaker and provider-specific alerting. Current probes/retry coverage are not uniformly verified.

## Backup policy to implement

- Managed DB: encrypted daily backups; 7 daily, 4 weekly, 6 monthly retention; point-in-time recovery if the provider supports it; off-site access-controlled copy.
- User uploads: object versioning plus separate daily manifest/checksum and replication; never rely on DB backup for file bytes.
- Secrets/config: deployment-as-code templates and encrypted secret-manager backup/recovery; never commit raw secret values.
- Verification: checksum/integrity on creation; automatic restore to isolated temporary targets; monthly application-level restore exercise; quarterly disaster tabletop.

## Phase 21 local snapshot

`backups/phase20-local-dev-db-post-change-20261005.sqlite` is a restricted local file-level snapshot of the current SQLite DB, not encrypted and not a pre-incident backup. It passed SQLite integrity/FK checks and a temporary file-level restore. The full staging recovery simulation requested by the phase has **not** been performed. See `PHASE_21_BACKUP_RESTORE_TEST.md`.
