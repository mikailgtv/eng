# Phase 29 — Dependency Security Report

**Dependency audit:** `npm audit --package-lock-only --json` completed successfully against the checked-in lockfile on 2026-10-08; reported 0 total, 0 critical, 0 high, 0 moderate, 0 low advisories. This audit checks the lockfile advisory database available at execution time; it does not prove runtime image/package installation or eliminate undisclosed vulnerabilities. No dependency installation or source changes were made.

Package manifest lists Next.js 15.5.27, Prisma/client 5.22.x, jose 5.9.6, bcryptjs 2.4.3, Zod 3.23.x, React 18.3.x. Actual locked package subversions should be checked in the lockfile. Workspace Node is 20.20.2 while manifest engine requires `>=22.13.0 <23`; this environment mismatch means runtime/build security behavior is NOT VERIFIED. Phase 27 remediation report exists, but its prior status does not substitute for this audit.
