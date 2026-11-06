# Phase 28.4 — Database Monitoring Report

**Status:** NOT VERIFIED; no live PostgreSQL provider or target is connected.

| Signal | Status |
|---|---|
| CPU / RAM | NOT MEASURED |
| Active/idle/waiting connections | NOT MEASURED |
| Active/slow queries | NOT MEASURED |
| Locks/deadlocks | NOT MEASURED |
| Database/table/index storage | NOT MEASURED |
| Growth rate | NOT MEASURED |
| Database error rate | NOT MEASURED |
| Alerting/owner/on-call | NOT CONFIGURED / NOT VERIFIED |

The app has `/health` and `/ready` probes; these only prove an application/database liveness query when actually invoked and do not provide database telemetry. Phase 28.3 historically returned 200 for these probes on a disposable local target, but no current PostgreSQL health test was possible. No `pg_stat_activity`, `pg_stat_database`, lock view, or provider metrics were collected.

**Recommendation:** choose a STAGING provider with metrics and alerts for connection saturation, storage, slow queries, lock waits/deadlocks and error rate; configure safe sampling/redaction and an owner. Do not claim monitoring readiness based only on health endpoints.
