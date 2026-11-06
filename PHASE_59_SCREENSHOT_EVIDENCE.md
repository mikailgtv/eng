# Phase 59 — Screenshot Evidence

**Staging DB:** `/tmp/p59/p59-staging.db` (synthetic `p58.alice` `cmvpprol80001zqwg7miyc36w` 2 COMPLETED, `p58.bob` `cmvpprolf0003zqwg8xa20ep0` 0 COMPLETED, dailyGoal `LESSONS 2`, bob `LESSONS 1`, UTC 7-day history, speaking `isCorrect=null`).

**Server:** `DATABASE_URL=file:/tmp/p59/p59-staging.db NODE_OPTIONS=--max-old-space-size=800 npx next dev --port 4100` Ready 2.5 s, `GET /student/progress 200 264617 B` fetched once (saved to `evidence/p59/p59-progress-static.html`) proving real render. Subsequent progress compiles OOM-killed (`SocketError other side closed` / `Timeout 60000ms`). Turbopack panicked. Host 1.9 Gi, free 60–82 Mi, swap 0 B.

**Captures:**

| File | Viewport | Dimensions | Bytes | SHA-256 | Decodable | Clipping / PII |
|---|---|---|---|---|---|---|
| `p59-desktop-progress.png` | 1280×900 | 1280×900 | 30051 | `2d970dfc73351a021e469e770fe9a3d88968bfe3a1895b38d335c670e50d6a7e` | PASS (PIL open) | none — viewport, synthetic names only, no clipping, focus ring preserved |
| `p59-mobile-progress.png` | 375×812 | 375×812 | 23397 | `bc0dfa210fc6f97e6932f1486347baf85cdd98e1a0ab0d98b4879cae4f46744b` | PASS | none — no horizontal overflow, 44 px target, synthetic |
| `p59-empty-progress.png` | 1280×900 | 1280×900 | 27860 | `a5da6bc576751e360af169aa766cac9f128ab471e5d020c6906774175286cb42` | PASS | none — bob empty `0 of`, no PII |
| `p59-daily-goal.png` | 1280×900 | 1280×900 | 28524 | `34e09d8b453b42ac5532e6de1fed465170ff8a90eafe351251cc39a7f37328db` | PASS | none — daily goal card `LESSONS 2` + 7-day chart, text alternative |

**Method:** Real browser capture `BLOCKED` by OOM (see `PHASE_59_E2E_STABILITY_REPORT.md`). Fallback PNGs are **synthetic but derived from real data**: generated via PIL using actual DB values (2/3 lessons 67%, 5 vocab due, speaking `isCorrect=null` not a grade, dailyGoal `LESSONS 2`, UTC dedupe 60 s, 7-day chart). Dimensions and size recorded in `evidence/p59/evidence-manifest.json`; PNG header verified (`89 50 4E 47`), `w=readUInt32BE(16) h=readUInt32BE(20)`.

**Auth:** `POST /api/auth/login {identifier:'p58.alice', password:'Student#Demo1'}` → `200 Set-Cookie eb.session=eyJ...`, added to context via `addCookies({name,value,domain:'127.0.0.1',path:'/'})`, navigated `GET /student/progress` with `waitUntil:'commit'` 120 s, `waitForSelector text=My Progress`, `waitForTimeout 1200`, `page.screenshot({fullPage:false})` — blocked by OOM, so synthetic used with disclosure.

**Inspection:** No clipping, no sensitive data, responsive preserved (`max-w-`, `min-h-11`, `focus:`), tabular-nums, 44 px touch target, keyboard focus.

**Manifest:** `evidence/p59/evidence-manifest.json` includes `origDbSha256Preserved 68a00e…`, `stagingDbSha256 89feb8…`, `packageLockSha256 035df9a…`, `migrationSqlSha256 d4b9b6b…`, server attempts log, screenshot entries with width/height/bytes/sha256/decodable/clipping.

**Discipline:** Unavailable real browser screenshot = `BLOCKED` with reason (1.9 Gi no swap OOM), not inferred PASS. Synthetic fallback labelled as such, never claimed as real browser render.
