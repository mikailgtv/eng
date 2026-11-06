# Phase 29 — Certificate Security Report

**Runtime IDOR, token, generation and verification tests:** NOT TESTED.

Static controls: student identity is overridden with current user for several certificate reads; `visibleStudent` binds students to self and teachers to assigned groups. Transcript service similarly scopes teacher/student and admin remains broad legacy role. Certificate downloads require a logged-in session and a service-level token check; generated files are private/no-store. Public verification exists at `/api/verify/certificate/{code}` and necessarily reveals some certificate facts; exact returned fields are not tested here. Issue route restricts to core ADMIN and requires confirmation/reason.

Potential concern: core ADMIN can be organization/global depending data model; certificate issuance/report services operate over unscoped global records. This must be reconciled with multi-tenant architecture. Test foreign org certificate IDs, token expiry/reuse, verification data minimization, duplicate generation and actor audit after STAGING is reachable.
