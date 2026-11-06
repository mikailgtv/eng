# Phase 28.4 — SQL Injection Report

**Runtime payload tests:** NOT VERIFIED — no active STAGING app/database is available.

## Static evidence

- Runtime SQL execution is limited to two static tagged-template `SELECT 1` probes; no unsafe Prisma raw methods were found.
- Search/filter routes use Prisma query objects. In user search, the searchable field names come from a fixed server-side list; input text is supplied as a Prisma filter value rather than concatenated SQL.
- Question-bank search uses `contains` with user-supplied value through Prisma; group student search uses `contains` on fixed fields. This is parameterized for SQL injection safety, though it may be a leading-wildcard performance issue.
- `apiRoute` returns generic internal errors; Prisma/SQL diagnostics and stacks are not placed in response bodies by `handleApiError`.

## Not tested

Payloads containing apostrophe, quote, boolean tautologies, filter/sort injection, malformed IDs and Persian Unicode were not sent to live PostgreSQL endpoints. No result is represented as a runtime “No SQL injection” pass. Execute the approved payload matrix on STAGING with response/data-change assertions and server-log redaction checks.
