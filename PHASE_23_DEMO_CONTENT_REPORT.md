# Phase 23 — Demo Content Report

**Status: BLOCKED. No Phase 23 demo curricula were created or seeded.** This is deliberate: the protected `prisma/dev.db` must not be used for Phase 23 demo writes, and no isolated content DB was provisioned.

## Current source evidence
- `prisma/curriculum/index.ts` defines an original Pre-A1 Starter course. Its source uses real curriculum seed structures and includes multiple levels, with only PRE_A1 active.
- Firefighter words and examples appear in `prisma/curriculum/pre-a1-modules-1-3.ts` and `pre-a1-modules-4-6.ts`, but a separate original firefighter-English demo curriculum was not evidenced.
- No dedicated day-worker-English curriculum was found in the searched curriculum/content source.
- `Curriculum.isDemo` exists and `src/lib/learning.ts` exposes a course demo flag. Existing Phase 20 report documents explicitly tagged demo fixtures in the local DB and warns they contain test progress/XP values; that DB is protected and was not queried or changed for this phase.
- The learning course overview can include demo courses if assigned, and the inspected content analytics function counts metrics/completions without an explicit demo filter. Therefore universal separation from real-content reporting is not established.

## Required next step
Create short, original Pre-A1 / firefighter-English / day-worker-English sample curricula in a disposable test environment, mark all demo records before insertion, keep them DRAFT and excluded from real-content analytics, and add tests proving no demo progress/scores mix with real learner reporting. Preserve all Phase 20 tagged fixtures as-is; do not reset or reseed `prisma/dev.db`. No publisher text or other copyrighted book content may be copied.