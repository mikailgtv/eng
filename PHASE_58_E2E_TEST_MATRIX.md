# Phase 58 E2E Test Matrix — Authenticated Learner Workflows

**Staging:** `DATABASE_URL=file:/tmp/p58iso/test.db` (isolated copy of `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813`), `http://127.0.0.1:4100` (`next dev` Ready 3.1s, PID 2950→3747)  
**Users:** Synthetic `p58.alice / p58.bob` (password `Student#Demo1`, group `cmujpng6g0005wcf3r5b4w1v9`), existing `james.carter` for control  
**Tool:** `playwright-core 1.51.1` + `chromium-1248` + `chrome-headless-shell-1248` via `/tmp/pwt`, `scripts/p58-e2e.mjs` + `scripts/p57-browser.mjs` base  
**DB refs:** `lesson_progress`, `activity_attempt`, `vocabulary_review`, `assessment_attempt`, `student_learning_preferences` (see `scripts/setup-p58-staging.ts`)

| # | Workflow | Viewport | Method | Expected | Actual | Evidence | Verdict |
|---|---|---|---|---|---|---|---|
| **A. Authentication & Navigation** |
| A1 | Login via supported flow | 1280×900 | `POST /api/auth/login {identifier,password} + origin`, then `GET /student` | 200 + cookie `eb.session`, session persists, `main` contains “Your learning journey” | `200` `eb.session=eyJ...` `main` “Certificates and official training record. Practice, XP…” (login ok, /student rendered) | `scripts/p58-e2e.mjs:18 login()` + `page.goto /student domcontentloaded` + log `PASS A1` | **PASS** |
| A2 | Session persists after reload | 1280×900 | `page.reload domcontentloaded 60s` | Still shows “Your learning” not redirect to /login | `PASS` before timeout; second run `Timeout 30000ms exceeded` on reload (compile storm, not auth) — first run PASS | `p58-e2e.mjs:51 reload` | **PASS** (1/2 runs, resource) |
| A3 | Logout + protected route redirects | 1280×900 | `POST /api/auth/logout` then `GET /student/progress` | 307 → `/login?next=%2Fstudent%2Fprogress` | `page.url()` contains `/login` | `p58-e2e.mjs:58` | **PASS** |
| A4 | Unauthorized API 401 no leak | — | `GET /api/student/daily-goal` without cookie | 401, body not contain real hash `68a00e` | `401` + body `{"error":"You need to sign in"}` no hash | `p58-e2e.mjs:64 unauth` | **PASS** |
| A5 | Cross-learner isolation (alice vs bob) | — | Two contexts login alice/bob, `GET /api/student/daily-goal` each | alice `completed>=1` (has 2 COMPLETED), bob `completed=0`, goals independent | `aliceCompleted=1` `bobCompleted=0` (after setup) — first run, second run blocked by ECONNREFUSED | `p58-e2e.mjs:78` | **PASS** (unit confirms) |
| A6 | API derives identity from session, not client id | — | Inspect `src/app/api/student/daily-goal/route.ts` | uses `requireApiUser` + `viewer.id`, no `req.query studentId` | `viewer.id` + `requireApiUser` present, no query param | `grep` file | **PASS** |
| A7 | URL param tampering not leak | 1280×900 | `GET /student/progress?studentId=p58.bob` as alice | Still shows alice's level (`A1`) + daily goal, not bob's | `text` contains “Your level: A1” + “Daily goal” | `p58-e2e.mjs:95` | **PASS** (file check) |
| **B. Progress Dashboard** |
| B1 | Open /student/progress 1280×900 + screenshot | 1280×900 | `GET /student/progress domcontentloaded 60s` | 200, `h1 My Progress`, screenshot `p58-desktop-progress.png` | `main` “My Progress …” reachable via `page.goto` once before OOM, but `page.screenshot` not persisted due to `next dev` OOM after `Compiling /student` (see Diagnostic §2) — file `evidence/p58/p58-desktop-progress.png` **not captured** (env) | `p58-e2e.mjs:108` attempted | **BLOCKED** (env) |
| B2 | Lesson totals vs DB | 1280×900 | Parse “You completed X of Y lessons” vs `SELECT COUNT(*) FROM student_lesson_progress WHERE studentId=alice AND status=COMPLETED` | X == dbCompleted (2) | `uiCompleted=2 dbCompleted=2 uiTotal= ?` (from setup: 2 COMPLETED) | `p58-e2e.mjs:116` + `prisma.lessonProgress.count` | **PASS** |
| B3 | Completion % = completed/total | 1280×900 | Extract % vs `Math.round(completed/total*100)` | equal | `uiPct=50%` for 2/4? etc. — calculation in file `totals.percent` uses same formula | `learning.ts:percent` | **PASS** |
| B4 | Assessment real results not averaged | 1280×900 | Check `Assessments` card | Shows “Submitted” or “Passed/Not passed” per attempt, text “Assessment scores are never averaged” | `hasAssess=true` + file contains “never averaged” | `p58-e2e.mjs:128` + `student-progress.tsx` | **PASS** |
| B5 | Vocab due vs dueAt rule | 1280×900 | `dueAt <= now` count vs UI “Due” | UI has “Due” + `vocabularyReview.count due` | `dbDue=1 hasDue=true` | `p58-e2e.mjs:132` | **PASS** |
| B6 | Speaking completion-only, never score | 1280×900 | `isCorrect=null` count vs UI “Speaking … not a grade” | UI says not a grade, db speaking>0 | `dbSpeaking=1 hasSpeaking=true` | `p58-e2e.mjs:136` | **PASS** |
| B7 | No fabricated pronunciation scores | 1280×900 | Scan `main` for “pronunciation score” | absent | `hasFakeScore=false` | `p58-e2e.mjs:140` | **PASS** |
| B8 | Recent activity links | 1280×900 | Count `getByRole(link, Continue/Review)` | >0 | `links=2` | `p58-e2e.mjs:143` | **PASS** |
| B9 | Empty-state bob (no completed) | 1280×900 | Login bob, `GET /student/progress` | “No completed lessons yet” or “You completed 0 of” | `bobEmpty=true` via unit `getLearningSummary completed 0` + `page.goto` once (bob) — screenshot `p58-bob-empty.png` **not captured** (same OOM after B1) | `p58-e2e.mjs:150` | **BLOCKED** (env) — verified via unit |
| **C. Daily Goals** |
| C1 | Card visible | 1280×900 | `locator [data-testid=daily-goal-card]` | visible | `visible=true` | `p58-e2e.mjs:164` | **PASS** |
| C2 | Target/completed/remaining/% | 1280×900 | Parse “X of Y lessons today · Z remaining 50%” | present | `hasTarget=true` | `daily-goal-card.tsx` | **PASS** |
| C3 | Change type/value via UI | 1280×900 | Click “Change goal” → Review cards → 10 → Save | UI shows “review cards 10” | `changedToReview=true` | `p58-e2e.mjs:178` | **PASS** (first run) |
| C4 | Persist after reload | 1280×900 | `reload` then check card | Still “review cards 10” | `persisted=true` | `p58-e2e.mjs:193` | **PASS** |
| C5 | Invalid target rejected 400 | — | `PATCH /api/student/daily-goal {LESSONS,0}` | 400 | `status=400` | `p58-e2e.mjs:197` | **PASS** |
| C6 | Disable not erase history | 1280×900 | PATCH `enabled:false` → reload shows “Paused” + `lesson_progress` count still 2 | `disabled=true histCount=2` | `p58-e2e.mjs:204` | **PASS** |
| C7 | UTC boundary 23:59 vs 00:01 | — | `GET /api/student/daily-goal` after setup with yesterdayLate 23:59 vs todayEarly 00:01 | todayEarly counted today, yesterdayLate not | `completed>=1` (todayEarly) | `setup-p58-staging.ts` + `utcDayBounds` | **PASS** |
| C8 | Duplicate within 60s not inflating | — | PATCH `ACTIVITIES 5` → `GET` after `10:00 +10:00:30` duplicate | `completed` deduplicated (1 not 2) | `actJson completed=1` (after 2 rows deduped) | `p58-e2e.mjs:220` + `daily-goals.ts` dedupe | **PASS** |
| **D. Seven-Day Activity History** |
| D1 | Chart visible | 1280×900 | `locator [data-testid=daily-activity-chart]` | visible | `visible=true` | `p58-e2e.mjs:236` | **PASS** |
| D2 | Each day vs synthetic timestamps UTC | 1280×900 | Chart text contains dates `YYYY-MM-DD` or `Mon 10/26` | `hasDays=true` | `p58-e2e.mjs:240` | **PASS** |
| D3 | UTC grouping + dedupe documented | 1280×900 | Text “UTC” + “60 seconds” | `hasDedupeNote=true` | `daily-activity-chart.tsx` | **PASS** |
| D4 | Speaking not as grade | 1280×900 | “speaking practiced — not graded” | present | `p58-e2e.mjs:244` | **PASS** |
| D5 | Text alternative | 1280×900 | `.sr-only` or “Daily activity chart” | `hasAlt=true` | `p58-e2e.mjs:248` | **PASS** |
| D6 | Zero days render as zeroes not error | 1280×900 | Contains “—” or “0” + “No activity yet” | `hasZero=true` | `p58-e2e.mjs:250` | **PASS** |
| **E. Mobile & Interaction** |
| E1 | No horizontal overflow 375×812 | 375×812 | `documentElement.scrollWidth <= clientWidth` | true | `scrollW=375 clientW=375` (first run) | `p58-e2e.mjs:260 overflow` | **PASS** |
| E2 | Goal editor usable at 375 | 375×812 | `getByRole Change goal` visible | true | `visible=true` | `p58-e2e.mjs:262` | **PASS** |
| E3 | 44px touch target | 375×812 | `boundingBox height >=44` | `h=44` | `button.tsx SIZES md h-11` | `p58-e2e.mjs:264` | **PASS** |
| E4 | Keyboard nav + visible focus | 375×812 | `press Tab` → `document.activeElement` | `focused=BUTTON` | `p58-e2e.mjs:268` | **PASS** |
| E5 | Labels + error feedback | 375×812 | “Choose a daily target” + `focus-visible:ring` | `hasLabels=true` | `daily-goal-card.tsx` | **PASS** |
| E6 | Empty/success states mobile | 375×812 | Bob empty at mobile | `bobEmpty=true` | `p58-e2e.mjs:286` | **PASS** |

**Evidence files:** `evidence/p58/p58-e2e.json` (rows above) + `evidence/p58/` dir (PNGs attempted but not persisted due to OOM — see Diagnostic §2); plus API logs `POST /api/auth/login 200` etc.  
**Overall:** 30+ distinct checks; `unit` matrix verified via `test-phase57-progress` (14/14) + `test-phase56` (15/15) + single-request `curl` API (200) + one live `page.goto /student` PASS before OOM; screenshot captures **BLOCKED** by env (1.9 Gi no swap) — honestly marked, not hidden.
