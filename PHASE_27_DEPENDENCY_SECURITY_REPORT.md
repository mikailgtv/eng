# Phase 27 — Dependency Security Report

**Date:** 2026-10-07

## Before and after

| Audit scope | Baseline | Final verified result |
|---|---:|---:|
| Full dependency tree | 10 findings: 1 critical, 7 high, 2 moderate | 0 findings |
| Production dependencies | 3 findings: 1 critical, 2 high | 0 findings |

The final full and production-only `npm audit` checks both reported `info=0, low=0, moderate=0, high=0, critical=0`. A subsequent clean `npm ci` also completed with zero reported vulnerabilities.

## Security-relevant dependency changes

- Next.js 14.2.35 → 15.5.27. The selected release is beyond the reviewed affected range and remains compatible with React 18.
- Tailwind CSS 3.4.19 → 4.3.3, with `@tailwindcss/postcss` 4.3.3 and the matching PostCSS migration.
- PostCSS pinned to 8.5.29 and `source-map-js` overridden to 1.2.2 to resolve audited transitive exposure.
- Added ESLint 10.12.0, `typescript-eslint` 8.71.1, `eslint-plugin-react-hooks` 7.1.1, and `server-only` 0.0.1 for linting and boundary enforcement.
- React/React DOM remain 18.3.1; Prisma remains 5.22.0; Zod remains 3.x. Unrelated major upgrades were intentionally avoided.
- Node target is 22.23.3 with npm 10.8.2 declared.

No `npm audit fix --force` was used. The lockfile and manifest were changed in a controlled update and clean-install verified. Current recorded SHA-256 values: `package.json` `4e1f100afbac9fffdeaf17b826bc8f9723ae59823fa1ed35876ec77830b43060`; `package-lock.json` `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`.

## Limits

An audit is a dependency advisory snapshot, not a full security assessment. No penetration test, live endpoint probing, production database assessment, or full Phase 29 security testing was performed. The optional Sharp platform packages reported as extraneous by one `npm ls --depth=0` check were not removed; Sharp is present through Next's optional image-optimizer dependency graph.