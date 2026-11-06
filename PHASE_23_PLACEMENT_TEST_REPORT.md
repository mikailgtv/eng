# Phase 23 — Placement Test Report

**Status: BLOCKED.** Existing assessment/diagnostic structures are reusable; current placement does not satisfy the requested adaptive, confidence-bearing placement flow.

## Verified implementation
- `Assessment.type` includes `PLACEMENT`; assessment attempts and item-level answers are persisted in the existing assessment tables.
- `src/lib/assessment/intelligence/placement.ts` records a `PlacementResult` from the attempt's overall `percentage` and maps it using fixed thresholds: `<30 PRE_A1`, `<45 A1`, `<60 A2`, `<75 B1`, `<88 B2`, otherwise `C1`.
- `PLACEMENT_LEVELS` in `src/lib/assessment/registry.ts` ends at C1, while the seed level catalog has a C2 row. The estimator cannot currently recommend C2.
- `src/lib/assessment/intelligence/adaptive.ts` chooses another approved question by difficulty after the previous answer, but accepts only `DIAGNOSTIC` assessments and does not constitute placement adaptivity or a calibrated ability estimate.
- Student page `src/app/(app)/student/exams/page.tsx` labels an existing result “Recommended starting level”; it does not show “Estimated Level,” skill coverage, confidence or confidence limitations.
- Teacher override accepts a level plus reason and may apply it to the user's `englishLevel`. The override API was corrected in this phase to call `assertStudentInScope` before changing a student. Typecheck passed; no DB-backed authorization test was run.

## Gaps / blockers
1. **High — placement model:** overall percent thresholds are not evidence of CEFR calibration, skill balance, item difficulty calibration, or representative samples. Root cause: current estimator uses one aggregate integer and fixed thresholds. Fix: use a validated skill-by-level blueprint and item evidence; mark insufficient coverage, disclose uncertainty, and do not imply certification.
2. **High — adaptivity and confidence:** no adaptive placement sequence or confidence field/derivation is currently stored or displayed. Fix: implement and validate adaptive selection for placement, record observed per-skill evidence and confidence/sample basis, and show an approximate “Estimated Level.”
3. **High — level coverage:** C2 exists in the catalog but placement stops at C1. Fix: only add C2 estimation/override support after a valid C2 question pool and defensible mapping exist; otherwise explicitly report the estimator ceiling.
4. **Medium — workflow:** no end-to-end student placement discovery/start/resume/result test or teacher override audit/scope integration test was performed in an isolated environment.

No placement attempt or student record was created. No test used `prisma/dev.db`. Do not interpret existing placement results as official CEFR certification.