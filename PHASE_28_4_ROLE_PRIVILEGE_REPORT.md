# Phase 28.4 — Role and Privilege Report

**Live catalog access:** NOT VERIFIED — no active STAGING PostgreSQL connection/tools are available. No role DDL or grant was executed.

| Logical role | Current status | Intended scope |
|---|---|---|
| `application_runtime` | NOT VERIFIED / NOT CONFIGURED in reachable target | `CONNECT`, schema `USAGE`, table `SELECT/INSERT/UPDATE/DELETE`; no database/schema DDL or role administration. No sequence privileges appear necessary in the Phase 28.3 schema (zero sequences), subject to actual catalog confirmation. |
| `migration` | NOT VERIFIED | Dedicated versioned migration execution; schema DDL only when a reviewed migration is applied. Not used by the running web app. |
| `backup` | NOT VERIFIED | Read-only access sufficient for the chosen backup mechanism or provider-managed backup identity; separate from runtime. |
| `readonly_audit` | NOT VERIFIED | `CONNECT`, schema `USAGE`, `SELECT` only; no mutation. |

## Least-privilege review

Static runtime code contains Prisma CRUD and no application DDL call sites. Prisma migrations are versioned under `prisma/migrations`; they are a separate deployment operation. The app does not demonstrate a runtime need for `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE DATABASE`, `CREATE ROLE`, or `ALTER ROLE`. Historical Phase 28.3 migration/import privileges do not establish least privilege for the application identity.

## Required verification on STAGING

1. Query `pg_roles`, database/schema/table privileges, default privileges and ownership using an audit-only identity.
2. Confirm runtime cannot `CREATE/DROP DATABASE`, `CREATE/ALTER ROLE`, create schema objects, truncate tables, or access unrelated schemas.
3. Confirm the migration identity can apply the approved versioned baseline while runtime cannot.
4. Confirm backup and read-only audit identities are separate, non-superuser, and cannot mutate application rows.

**No credentials or grant output were stored.** Provider/RLS policy remains NOT VERIFIED.
