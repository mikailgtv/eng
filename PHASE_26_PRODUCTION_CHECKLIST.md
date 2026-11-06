# Phase 26 — Production Go-Live Checklist

**Current result: all live-infrastructure acceptance gates are open.** A checked box requires recorded evidence, not a configuration intention.

## Foundation / environment
- [ ] Named owner and on-call route approved.
- [ ] Hosting/runtime/provider selected and remote account access verified.
- [ ] Development, Staging and Production contexts separated.
- [ ] Staging DB/storage/provider credentials cannot reach production.
- [ ] Production domain and DNS ownership confirmed; HTTPS redirect/certificate tested.
- [ ] Production config preflight passes using platform-injected secrets; no values logged.
- [ ] Demo hints and all demo/seed flags disabled; no demo rows in production.

## Database and data
- [ ] Production PostgreSQL provisioned with capacity, region, TLS, pooling and access controls.
- [ ] Versioned migration baseline/chain reviewed and rehearsed on disposable PostgreSQL.
- [ ] Pre-migration backup/PITR verified; migration, integrity and app smoke passed in Staging.
- [ ] Demo and local data excluded; any approved transfer has reconciliation/audit/rollback.
- [ ] Daily encrypted backups, retention, PITR (if offered) and failure alerts enabled.
- [ ] Recent backup restored to isolated environment; key workflows/data integrity verified.
- [ ] RPO/RTO measured and owner-approved; object backup separately tested.

## Security and quality
- [ ] Critical/high dependencies triaged; no unresolved critical issue; reviewed fixes/regression tests passed.
- [ ] Authentication/recovery/session revocation, roles and tenant/IDOR test matrix passed.
- [ ] CSRF, cookie flags, CORS, CSP/HSTS/transport and security headers reviewed on actual domain.
- [ ] No secrets in Git history/artifacts/client bundles; secret scanning enabled.
- [ ] Upload/audio access, limits, malware policy, storage ACL and restore tested.
- [ ] AI/provider failure does not break core LMS; data processing and fallback approved.
- [ ] Notification/email failures do not break learning workflows; retries/status observable.
- [ ] Migration-safe app rollback and job pause/restart rehearsed.

## Observability/operations
- [ ] External uptime checks and `/ready` configured.
- [ ] Central structured logs, error tracking, route latency/error metrics and redaction verified.
- [ ] Alerts tested for DB, high errors/latency, worker, backup, storage and auth abuse.
- [ ] Worker scheduler, heartbeat, retry/idempotency and failed-job queue operational.
- [ ] Performance/load/mobile/accessibility baselines recorded for supported capacity.
- [ ] Authenticated student, teacher and admin smoke suites passed with real staging routes/data.
- [ ] 15m/30m/1h/6h/24h monitoring owner and rollback decision path staffed.

## Release record
- [ ] Final backup/PITR point ID and migration ID recorded.
- [ ] Immutable build/deploy ID and approver recorded.
- [ ] Smoke, restore and security evidence attached without secrets or unnecessary PII.
- [ ] Production traffic opened only after healthy/ready and functional smoke pass.

Nothing in this checklist is asserted complete merely because a report or code path exists.