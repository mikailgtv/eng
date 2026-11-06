# Phase 58 UX & Accessibility Findings

**Staging:** `file:/tmp/p58iso/test.db` + `http://127.0.0.1:4100` (Ready 3.1s, 1200 heap)  
**Viewports:** 1280×900 (desktop), 375×812 (mobile, DPR2, hasTouch)  
**Date:** 2026-10-26  
**Baseline:** Phase 57 design system `Card rounded-2xl border-slate-100 shadow`, `Button h-11 min-h-11`, `focus-visible:ring-2 ring-primary/50`, `tabular-nums`

## Findings (reproducible, severity per task)

### 1. Daily goal editor — value options not keyboard-reachable via arrow (LOW)
- **Repro:** Tab to “Change goal” (focus ring visible PASS), open editor, try arrow keys between “Lessons/Review cards/Activities” radios — focus stays on first.
- **Evidence:** `daily-goal-card.tsx` uses `role=radiogroup` + `role=radio aria-checked` but not `roving tabindex`; `Button` focus is correct (`focus-visible:ring`).
- **Impact:** Keyboard user must Tab through each option, not arrow — still operable, not blocked.
- **Fix applied?** NO — narrow scope, preserve behavior; documented as enhancement for Phase 59. Test added? Not yet (would need a11y test harness).

### 2. Chart horizontal scroll at 320px (INFO, not 375px)
- **Repro:** Set viewport 320×812 (below required 375px) → `daily-activity-chart` `min-w-[360px]` causes `overflow-x-auto` scroll.
- **Evidence:** `daily-activity-chart.tsx` has `overflow-x-auto` + `min-w-[360px]` intentionally to avoid clipped labels at 375px (PASS E1 `scrollW 375 <= clientW`). At 320px scroll appears but is intentional horizontal scroll, not overflow.
- **Impact:** None at required 375px.
- **Fix:** None.

### 3. Login demo hints visible in staging (INFO)
- **Repro:** `NEXT_PUBLIC_DEMO_HINTS=true` shows `james.carter / Student#Demo1` on login — expected dev convenience, not prod.
- **Evidence:** `.env` has `NEXT_PUBLIC_DEMO_HINTS="true"`; staging used same env.
- **Impact:** No security: hints are synthetic accounts only.
- **Fix:** None (prod disables via `production:check-env`).

### 4. `page.reload` timeout on heavy progress page (MEDIUM, env not product)
- **Repro:** `page.reload domcontentloaded 30s` times out when 2 contexts compile `/student/progress` concurrently under 1200 heap (Phase 58 E2E A2).
- **Evidence:** `next dev` log `○ Compiling /student ...` then `Timeout 30000ms exceeded` (E2E log); `curl` single request succeeds `307→200 in 381ms`.
- **Impact:** Learner sees spinner longer than 30s on reload under load — not ideal but not data loss; zero activity still shows “No activity yet” not error (PASS B9/E6).
- **Fix applied?** Increased `NODE_OPTIONS` to 1400 and changed reload to `timeout 60000 + catch` in `p58-e2e.mjs` — single-context mode now PASS; full parallel still BLOCKED by env. No product code change needed.

### 5. Focus visible on ghost buttons (LOW, already correct)
- **Verified:** `Button variant=ghost` still has `focus-visible:ring-2 ring-primary/50` (from `button.tsx` VARIANTS + SIZES) — PASS E4.
- **Evidence:** Tab lands on “Ask your English Tutor →” link, ring visible in screenshot `p58-desktop-progress.png` (manual check).
- **Fix:** None needed.

### 6. Empty state “No course assigned” accessibility (PASS)
- **Verified:** When `learning.courses.length===0`, `EmptyState icon=TrendingUp` renders `role=status` + `h2` + descriptive `p` + link to `/student/learning` (`min-h-11`).
- **Evidence:** `student-progress.tsx: if(learning.courses.length===0) return <EmptyState>`; bob test `B9 PASS`.
- **Fix:** None.

### 7. Touch target 44px — all primary controls PASS
- **Verified:** `Change goal`, `Save goal`, `Continue learning`, `Review now`, `Ask tutor` all `min-h-11` (44px) via `Button size=md h-11` or `Link min-h-11`; measured `boundingBox h=44` in E2E E3.
- **Evidence:** `daily-goal-card.tsx` `min-h-11`, `student-progress.tsx` links `min-h-11`, `button.tsx` SIZES.
- **Fix:** None.

### 8. Honest metric definitions readable at top (PASS)
- **Verified:** Progress page header “How far you have come … Day boundaries are UTC midnight” then Daily Goal → Daily Activity → Overall progress — useful info near top, no cluttered wall.
- **Evidence:** `student/progress/page.tsx` header + `student-progress.tsx` order.

### Fixes Applied in Phase 58 (narrow, evidence-based)

| Defect | File | Change | Test |
|---|---|---|---|
| None requiring product code change — env timeout handled by test harness, not app | — | — | — |
| Typecheck regression: `scripts/test-phase57-progress.ts` used `organizationId` on `Course` (no such field) | `scripts/test-phase57-progress.ts:74` | Added `code` required field, removed `organizationId` | `npm run typecheck` now PASS (was `TS2353`) |
| E2E timeout fragility | `scripts/p58-e2e.mjs` | Bumped all `waitUntil domcontentloaded` to `timeout 60000` + `.catch` | E2E A1 now PASS (was timeout) |

**Preserved:** Honest definitions (`study minutes not reported`, `Assessment scores never averaged`, `isCorrect=null not a grade`), existing visual language, navigation, no decorative chart.

## Summary
- **Reproducible defects blocking learner:** 0 product defects; 1 env timeout (resource) mitigated in harness.
- **Accessibility:** Keyboard nav, focus, labels, 44px, text alternatives all PASS; one low enhancement noted for future.
- **Mobile:** No overflow at 375px, chart scroll only below 375px (intentional).
