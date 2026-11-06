# Phase 26 — Monitoring, Logging and Alerting

**Status: PARTIAL foundations; no external monitoring or alerting was configured.**

## Current observability
- Public `/health` calls `getSystemHealth()`, which runs a database `SELECT 1` and returns only a generic healthy/unavailable response; no component secrets are exposed.
- Admin System Health reports database probe, API runtime, optional provider configuration and missing storage/scheduler telemetry. Provider labels marked DEGRADED are configuration observations, not live service probes.
- Phase 21 added request IDs and safe generic API error responses for wrapped routes; audit events exist in the database.
- No uptime probe, central structured log sink, APM/trace service, error tracker, metrics dashboard, alert destination or error-rate history was verified.

## Phase 26 addition
`GET /ready` was added as a separate, non-cached readiness probe. It performs a harmless DB query and returns only `{ready:true}` or `{ready:false}` with 200/503; it exposes no connection details. It has not been exercised against a staging database.

## Suggested monitored signals (provider-neutral)
- **Uptime:** HTTPS `/health` liveness plus `/ready` dependency readiness, external from the application region.
- **App:** request count, 4xx/5xx split, route/latency percentiles, build/deploy ID, cold starts, CPU/memory, timeouts and unhandled errors.
- **Database:** connection saturation/pool waits, query latency, deadlocks, storage growth, availability, backup/PITR status, replication lag if applicable.
- **Jobs:** last successful worker heartbeat, queued/processing/retry/failed counts, oldest job age, duplicate/idempotency failures.
- **Storage/audio:** provider availability, upload failure/type rejection, byte/usage quota, read/permission failures and backup checksums.
- **Providers:** AI/STT/TTS/email/SMS/web-push/integration timeouts and submission-vs-delivery distinctions; avoid payloads/PII in logs.
- **Security:** auth/rate-limit spikes, repeated 401/403/429, unusual admin/permission/session changes, secret/config failures.

## Alert definitions to implement after baseline
Alerts should be configurable and actionable: sustained `/ready` failures, DB connection loss/saturation, elevated 5xx/latency, no worker heartbeat/oldest queue age, backup/restore-check failure, storage errors, provider failures and authentication-abuse spikes. Set numeric thresholds from Staging load/capacity and service/provider SLO, not invented here. Route to named on-call owners; deduplicate, escalate, and test alert delivery.

## Logging requirements
Use structured records with timestamp, level, requestId, route, deployment/environment, safe actor ID only when operationally needed, duration, error code and dependency name. Do not log secrets, cookies, tokens, password/reset values, raw answer bodies, audio, private teacher notes or unnecessary PII. Define access, retention and redaction. Existing audit log remains distinct from high-volume operational telemetry.

**Blocker:** High — no live monitoring, error tracking, external uptime, thresholds or alert routing. `/ready` code alone is not monitoring.