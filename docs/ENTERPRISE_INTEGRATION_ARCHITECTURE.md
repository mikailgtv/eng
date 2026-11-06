# Enterprise Integration Architecture (Phase 18)

## Purpose and boundaries

Phase 18 adds a modular integration foundation to the existing EnglishBridge LMS. The architecture separates core LMS services from vendor adapters and keeps the same responsive web application, backend, database, sessions, accounts, and learner records. The current implementation is a foundation, not a claim that external vendors are already connected.

```text
LMS features / admin tools
          ↓
Integration services and registry
          ↓
Provider contracts (interfaces)
          ↓
Registered, configured adapter (none enabled by default)
          ↓
External organization system
```

Unconfigured registry entries are `DISCONNECTED`. The manager intentionally does not register demo adapters as production providers and does not report simulated connection tests as successful.

## Integration Manager and providers

`src/lib/integrations/manager.ts` owns the registry, connection reads, secret handling, health checks, and circuit-breaker calls. Contracts in `types.ts` cover generic health checks plus email, SMS, web push, calendars, identity, HR directories, storage, and learning records. A real provider is installed server-side by implementing the relevant interface and registering its adapter. Secrets are passed only to server-side adapter methods.

The repository currently has no production provider registered. SMTP, SMS, browser push, OIDC, SAML, Google/Microsoft API, HRIS, and external LRS connectivity are deferred until a vendor adapter, credentials, sandbox testing, and operational settings are supplied.

## Registry, organization scope, and authorization

Connection and webhook records carry organization scope; API clients are bound to the creating administrator’s organization. Routes resolve the session user, use Phase 15 `integrations.view/manage/sync` permissions, and reject missing organization scope. API read queries and exports filter records by that organization. Import commits verify both creator and organization.

The implementation has not yet added tenant ownership to every observability/mapping/job table or implemented a full per-resource delegation policy. Cross-organization isolation requires additional integration-specific review before multi-organization production use.

## Authentication and identity

`ExternalIdentityLink` stores an external subject reference and minimal identity attributes; it does not store external passwords. HR provisioning will not auto-link an existing LMS account using email alone. Such a match becomes a conflict for a separately verified link process.

`IIdentityProvider` defines seams for authorization URL, code exchange, and identity-token validation. There is no running OIDC/SAML login flow, callback, nonce/state store, signature/JWKS verifier, claim mapper, SAML parser, link/unlink UX, or automatic account provisioning through SSO in this implementation. Those must be implemented and security-tested before SSO is advertised.

## Credentials and secret management

- Integration credentials are encrypted with AES-256-GCM (`enc:v1` envelope: random IV, authentication tag, ciphertext).
- The server requires `INTEGRATION_SECRET_KEY` (minimum 32 characters) in production. No hard-coded production encryption key fallback is allowed.
- API client credentials are high-entropy random values. The plaintext is shown only once, and only a hash is stored. Rotation and revocation APIs are present.
- UI registry responses mask stored credential hints and redact secret-like config keys.
- Secret-key rotation and re-encryption procedures are not yet implemented; the production key must be backed up and governed operationally.

## API architecture

The versioned API is explicitly limited to:

| Route | Scope | Data boundary |
|---|---|---|
| `GET /api/v1/users` | `users:read` | Users in the API client’s organization |
| `GET /api/v1/assessments` | `assessments:read` | Assessments associated with courses assigned to that organization |
| `GET /api/v1/learning-records` | `learning_records:read` | Submitted assessment attempts from that organization |

Auth uses API bearer credentials, optional client ID consistency, expiry, active/revoked state, per-key scopes, and per-client in-memory throttling. Unknown scopes are rejected at key creation. The current API supports read-only contracts; it does not implement OAuth2 client-credentials grants or general write operations.

## Webhooks

Outbound webhook subscriptions are scoped to the creating organization and explicit event names. Requests contain a random event/delivery identifier, event type, timestamp, organization ID, and payload; the signature covers the timestamp and raw body with HMAC-SHA256. Outbound HTTP redirects are refused, transient failures use a finite exponential retry loop, permanent failures stop retrying, and repeated failures disable the endpoint.

Inbound webhook handling requires an organization ID, configured encrypted secret, fresh timestamp, delivery ID, signature, JSON schema basics, and idempotent receipt. It records a validated receipt; it does not yet execute event-specific changes to LMS records. Outbound source-event hooks are not yet wired across all Phase 1–17 event sources.

The dispatch loop currently runs in-process and is not a durable queue. Payload retention cleanup and per-subscription replay controls are not implemented.

## HR synchronization and imports

The HR service accepts normalized directory records, scopes them to an organization, links new records to external subject IDs, limits provisioning roles to Student/Teacher, and soft-deactivates accounts without deleting learning history. Existing-account email matches are conflicts, not automatic identity links. Provider pagination, scheduled runs, manager sync, employment-field authority mappings, staged change review UI, and job cancellation remain to be added.

The current import service accepts CSV/JSON for users only. It stores a dry-run preview and complete source dataset, reports validation errors, rejects duplicates and existing-email conflicts, and uses an atomic all-or-nothing commit. It rejects incomplete/error batches rather than silently importing only the valid preview rows. XLSX, groups, departments, courses, enrollments, and rollback are not implemented.

## Calendar

`/api/user/calendar.ics` produces an authenticated iCalendar feed for class sessions belonging to the student’s group or sessions taught by a teacher. It emits no synthetic/fabricated appointments. External calendar APIs, exams/assignment events, recurrence synchronization, cancellation/update propagation, user-selected time zones, and mapping lifecycle are deferred.

## Failure isolation and circuit breaking

`CircuitBreaker` supports `CLOSED`, `OPEN`, and `HALF_OPEN` states, a finite failure threshold, timeout, and recovery test. It prevents repeated calls through the same process to a failing adapter. Because its state is in-memory, it is not shared across replicas or restarts. Durable retry queues, scheduled worker execution, retry cancellation, and system-level backpressure need a shared queue/store in production.

## SSRF and network controls

The URL validator rejects unsafe schemes, common loopback/private/link-local/metadata IP literals, and unapproved ports. Outbound webhooks use `redirect: manual` and refuse redirects. This is not a complete defense against DNS rebinding or public hostnames resolving to private addresses. Production must route provider egress through network controls that block internal ranges and metadata services, and resolve/pin destinations before connecting.

## Observability, privacy, and retention

Integration logs store status, action, duration, external HTTP status, and safe error messages. Webhook payloads are currently retained in delivery records to support retries; there is no configured cleanup scheduler or legal-hold workflow. Production retention, redaction, access review, delivery metrics, and data minimization must be finalized before retaining sensitive external payloads.

## Mobile web

Admin integration management and student calendar download are served through the existing responsive web application. There is no native application or separate mobile backend. This turn did not include physical-device, browser automation, or accessibility audits for the new UI.

## Deployment prerequisites

1. Create and review formal Prisma migrations; the repository had no migration history and local schema was updated with Prisma `db push`.
2. Provision and back up `INTEGRATION_SECRET_KEY` securely.
3. Add vetted vendor adapters and sandbox credentials; confirm provider contract, rate limits, data residency, and retention.
4. Add a durable job queue and shared circuit/rate-limit state for multi-instance deployments.
5. Apply network-level outbound filtering and DNS rebinding protections.
6. Run cross-organization, OAuth/SAML, webhook replay, load, mobile browser, and accessibility tests before launch.
