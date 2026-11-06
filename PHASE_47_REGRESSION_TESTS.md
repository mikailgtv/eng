# Phase 47 — Regression Tests and Evidence

Everything below was **executed in this session**. Commands are quoted with real exit statuses. Nothing is inferred from source reading alone.

**Summary:** 44 browser checks passed (30 loading + 14 functionality) · 20/20 HTTP status checks · 11/11 baseline-comparison probes · 6/6 new placement guards (mutation-checked) · 10/10 Phase 46 suite still green · `release:verify` EXIT 0.

---

## 1. How the loading state was observed (test-only method)

The list pages render in well under a second in this environment, so a loading state is normally invisible — which is correct behaviour, not a defect. Two methods were tried:

* **Holding the client-side RSC request** — the request was intercepted and held, but the fallback did **not** appear in `next dev`: without the segment payload, the router keeps the current page. Recorded, not used as evidence.
* **Test-only slow-streaming proxy** (used) — a throwaway Node HTTP server on `:4048` forwards to the dev server, releases the **first** chunk of an HTML document immediately (that is the shell Next already flushes, containing the fallback), then holds the remainder for 1500 ms. The browser therefore paints the skeleton while the page data is still streaming.

No delay was added to production code, and the proxy lives only in `/tmp/pwt/phase47.mjs`. It exercises the same shell-flush behaviour that makes these boundaries meaningful in the first place.

---

## 2. Loading-state results — 30/30 passed

Each route was checked at **1280×900** and **375×812**. "Real content already shown" is the control that proves the skeleton was actually visible *before* the content, not merely present in the DOM.

| Viewport | Route | Loading UI visible | Real content then rendered | Not stuck | No overflow | Console errors |
| --- | --- | --- | --- | --- | --- | --- |
| desktop | `/admin/users` | yes (`aria-busy=1`, content not yet shown) | yes | yes (0 remaining) | yes | none |
| desktop | `/teacher/results` | yes | yes | yes | yes | none |
| desktop | `/student/notifications` | yes | yes | yes | yes | none |
| 375 px | `/admin/users` | yes | yes | yes | yes (`scrollWidth=375`) | none |
| 375 px | `/teacher/results` | yes | yes | yes | yes (`scrollWidth=375`) | none |
| 375 px | `/student/notifications` | yes | yes | yes | yes (`scrollWidth=375`) | none |

Per route and viewport that is 5 checks: loading visible, no horizontal overflow, content rendered, not stuck, no console errors → **30 checks**.

Screenshots (12): `evidence/p47/{desktop,mobile375}-{admin-users,teacher-results,student-notifications}-{loading,loaded}.png`.

Boundary-scope control (curl, in the streamed HTML):

| Route | `aria-busy` count |
| --- | --- |
| `/admin/users` | 1 |
| `/teacher/results` | 1 |
| `/student/notifications` | 1 |
| `/admin/users/<valid>` (detail) | **0** |
| `/teacher/results/<attempt>` (detail) | **0** |
| `/student/notifications/preferences` | **0** |

---

## 3. HTTP status and routing — 20/20 passed

Route lists taken verbatim from `PHASE_46_REGRESSION_TESTS.md`, one missing id (`cmuno000000000000000000000`) each.

**13 missing-record routes → all 404**

| # | Route | Status |
| --- | --- | --- |
| 1 | `/teacher/assignments/<missing>` | 404 |
| 2 | `/teacher/classes/<missing>` | 404 |
| 3 | `/teacher/content/builder/<missing>` | 404 |
| 4 | `/teacher/content/course/<missing>` | 404 |
| 5 | `/teacher/content/preview/<missing>` | 404 |
| 6 | `/teacher/courses/lessons/<missing>` | 404 |
| 7 | `/teacher/exams/<missing>` | 404 |
| 8 | `/teacher/groups/<missing>` | 404 |
| 9 | `/teacher/questions/<missing>` | 404 |
| 10 | `/teacher/students/<missing>` | 404 |
| 11 | `/student/assignments/<missing>` | 404 |
| 12 | `/student/exams/<missing>` | 404 |
| 13 | `/student/learn/<missing>` | 404 |

**6 valid detail pages → all 200**

| # | Route | Status |
| --- | --- | --- |
| 14 | `/teacher/groups/cmujpng6g0005wcf3r5b4w1v9` | 200 |
| 15 | `/teacher/students/cmujpngfr000fwcf3tsbg5wc3` | 200 |
| 16 | `/teacher/assignments/seed-shift-a-writing` | 200 |
| 17 | `/teacher/exams/cmujuaojz0084mlewkow2kcvj` | 200 |
| 18 | `/student/exams/cmujuaojz0084mlewkow2kcvj` | 200 |
| 19 | `/admin/users/cmujpngfr000fwcf3tsbg5wc3` | 200 |
| 20 | `/p47-no-such-route` (unknown) | 404 |

**Redirects and anonymous access unchanged** (11 baseline-comparison probes, all identical before and after):

| Path | Baseline | After |
| --- | --- | --- |
| `/admin/users` as STUDENT (unauthorized) | 307 → `/unauthorized` | **307** |
| `/admin/users` anonymous | 307 → `/login` | **307** |
| `/teacher/results` anonymous | 307 | **307** |
| `/student/notifications` anonymous | 307 | **307** |

**Detail routes that are *not* under the new boundaries keep their non-404 behaviour too:** `/teacher/results/<missing>` is 500 before and after — the new boundary deliberately does not reach it, so an error is not disguised as a success.

---

## 4. Existing functionality — 14/14 passed

| # | Check | Result |
| --- | --- | --- |
| 1 | Results: search box still present (`#list-search`) | 1 input |
| 2 | Results: page 1 shows 25 of 30 | rows=25 |
| 3 | Results: pagination intact | "Page 1 of 2" |
| 4 | Results: `?q=Mei` still filters | rows=6 |
| 5 | Results: search + `result=PASSED` combine | rows=2 |
| 6 | Results: page 2 intact | rows=5 |
| 7 | Results: `?q=Quiz&page=9` still clamped | rows=20 |
| 8 | Results: no-match empty state + Clear search | present |
| 9 | Users: normal content renders | header present |
| 10 | Users: search input present | 1 input |
| 11 | Users: `?q=james` still filters | match found |
| 12 | Notifications: normal content renders | summary present |
| 13 | Notifications: preferences link intact | 2 links |
| 14 | Preferences page still renders | quiet-hours section present |

---

## 5. Repository test suites

**New — `npm run test:phase47` → EXIT 0, 6/6**

```
✓ the global (app) loading boundary is still absent
✓ the three approved list pages have a loading boundary
✓ no loading boundary sits directly above a detail route
✓ every loading boundary wraps a subtree with no notFound() page
✓ each loading boundary wraps exactly one page
✓ the admin user 404 keeps its preserved not-found UI
=== Phase 47 loading boundaries: 6 passed, 0 failed ===
```

`scripts/test-phase47-loading-boundaries.ts` walks `src/app`, and for **every** `loading.tsx` it finds, asserts that no `page.tsx` anywhere beneath that segment calls `notFound()`. This encodes the Phase 46 failure mode as a permanent invariant, not just a fact about today's three files.

**Mutation check (the guard can fail):** adding `src/app/(app)/admin/users/loading.tsx` produced

```
✗ no loading boundary sits directly above a detail route
✗ every loading boundary wraps a subtree with no notFound() page
✗ each loading boundary wraps exactly one page
=== Phase 47 loading boundaries: 3 passed, 3 failed ===
```

The file was then removed and the suite returned to 6/6.

**Existing — `npm run test:phase46` → EXIT 0, 10/10** (search, admin 404 copy, save boundaries, `dev.db` integrity) — unchanged by this phase.

---

## 6. Commands and real exit statuses

| Command | Exit | Notes |
| --- | --- | --- |
| `npm run typecheck` (stale `.next`) | **2** | `TS2307` on moved page paths — stale generated types, not source |
| `rm -rf .next` + `npm run typecheck` | **0** | clean |
| `npm run test:phase47` | **0** | 6/6 |
| `npm run test:phase47` (misplaced boundary) | **1** | 3/6 — deliberate, then reverted |
| `npm run test:phase46` | **0** | 10/10 |
| `npm run release:verify` | **0** | typecheck + full `npm test` + `build:safe` |
| `node /tmp/pwt/phase47.mjs` (loading) | **0** | 30/30 |
| `node /tmp/pwt/func47.mjs` (functionality) | **0** | 14/14 |
| curl status sweeps | — | 20/20 and 11/11 |

Full chain inside `release:verify`:

```
=== db-tls / backup-connection unit tests: 32 passed, 0 failed ===
=== request-trust & origin policy: 23 passed, 0 failed ===
=== staging readiness gate — contract tests: 27 passed, 0 failed ===
=== release safety contracts: 13 passed, 0 failed ===
=== Phase 46 regressions: 10 passed, 0 failed ===
=== Phase 47 loading boundaries: 6 passed, 0 failed ===
```

The production route table still contains the three routes at their original URLs (`/admin/users`, `/teacher/results`, `/student/notifications`), confirming the route groups are URL-transparent.

---

## 7. Data and project integrity

| Item | Baseline | After | Status |
| --- | --- | --- | --- |
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | identical | **UNCHANGED** |
| `package-lock.json` SHA-256 | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | identical | **UNCHANGED** |
| `.env` SHA-256 | `6da800151ba6962c32e7e3d66eb82a7223ea5d5e3cf2df40e6053102b8bd33cb` | identical | **UNCHANGED** |
| `prisma/migrations.postgresql/MANIFEST.sha256` | 4/4 OK | 4/4 OK | **UNCHANGED** |
| Browser packages in `package.json` | 0 | 0 | **NONE ADDED** |

Test-only data lived exclusively in `/tmp/p47_preview.db` (copy of the repo DB + 30 attempts). The repo database was read once to make the copy and never written.

---

## 8. Not tested — and why

| Not tested | Reason |
| --- | --- |
| Production-mode rendering (`next start`) | Unusable in this sandbox (production guards reject SQLite/localhost without `INTEGRATION_SECRET_KEY`) — pre-existing, unchanged. All evidence is `next dev`. |
| The loading state during *client-side* navigation to an unfetched route | Holding the RSC payload did not surface the fallback in `next dev`; a production build was not available to test the prefetched path. **Not claimed.** |
| Other list pages (`/teacher/assignments`, `/teacher/students`, `/admin/groups`, …) | Out of the three-route scope of this phase; each needs its own subtree check before a boundary is added. |
| Very slow real networks | The proxy simulates a slow stream, not a slow data layer. Layout behaviour under a real slow query was not observed. |
| Screen-reader announcement of the skeleton | `aria-busy` + `sr-only` text are present and verified in the DOM, but no assistive-technology session was run. |
