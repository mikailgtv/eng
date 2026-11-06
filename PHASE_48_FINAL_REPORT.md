# PHASE 48 — FINAL REPORT

**Verdict: `PARTIAL`**

The AI Tutor was exercised as a learner in a real browser. The **interface and conversation mechanics work end to end** — sending, streaming, ordering, persistence across navigation and reload, mode switching, ending with a summary, error handling, and mobile layout all behaved correctly. But **provider-backed AI responses could not be verified** (no `AI_API_KEY` in this environment, and fabricating one is forbidden), and the fallback that runs instead **does not answer the learner's question**. The product's core value therefore remains unvalidated here, and as configured it does not deliver it.

| Gate | Result |
| --- | --- |
| Browser checks executed | **41** — 40 passed, 1 failed (the failure *is* defect D2) |
| API-level checks | **7** — all behaved as designed |
| Informational probes | **3** — response quality, difficulty, session hygiene |
| Real provider-backed responses verified | **NO — not possible, no provider configured** |
| Responses labelled as fallback | **YES** — `"provider":"curriculum"`, `providerConfigured:false` |
| Confirmed defects | **7** (1 High, 2 Medium, 4 Low) |
| Source files modified | **0** |
| `prisma/dev.db` / lockfile / `.env` | **UNCHANGED** |

---

## 1. Provider verification — stated plainly

**No real AI provider is configured in this environment.** `AI_API_KEY` is absent from `.env`; the API returns `providerConfigured:false`, every reply carries `"provider":"curriculum"`, and `/admin/ai` states *"External tutor is not configured. Practice uses course content on this server."*

Consequently:

* **No provider-backed response was observed, and none is claimed.** No credential was invented and no successful AI response was mocked inside the application.
* The server code's external path (`externalTutorReply`, 20 s timeout, `provider-unavailable` on non-2xx) was **read but never executed**.
* Structured modes (Vocabulary, Grammar, Quiz, Mistake review) never call a provider by design, so they are unaffected either way.
* The exact missing prerequisite is a server-side `AI_API_KEY` (optionally `AI_BASE_URL`, `AI_MODEL`). No value is printed or required from anyone.

---

## 2. What works (confirmed by execution)

Full list with evidence IDs in `PHASE_48_AI_TUTOR_FINDINGS.md` §1. Highlights:

* Entry from the student dashboard; honest disclosure "AI Practice, not a teacher and not an exam"; learner level shown.
* 7 practice modes; empty state; Send disabled on empty/whitespace input; suggested prompts gated until a session starts.
* Optimistic user message in ~107 ms, a "Thinking…" indicator, then a streamed reply that renders correctly.
* Correct alternation (`TUTOR>YOU>TUTOR>YOU>TUTOR`) and prior turns retained.
* No duplicate message on a forced rapid double-click; Send disabled in flight.
* **Persistence is genuinely solid** — after leaving and returning, *and* after a full page reload, the transcript was character-for-character identical to what had been on screen.
* "End and summarize" works and says "This is not a grade"; End then disables.
* Error handling is clear and specific: 422 empty, 422 over-500-chars, 404 unknown session, 404 another student's session (no leakage), 422 after end, 429 daily limit — surfaced as a visible alert with the composer still usable.
* Voice admits it is unavailable rather than failing silently.
* 375 px: no horizontal overflow before or after a conversation; composer usable.

---

## 3. Confirmed defects

| ID | Defect | Severity | Reproduced |
| --- | --- | --- | --- |
| **D1** | Replies ignore the question: three different English questions returned the identical `Good. What is this? / hello`; two different turns in one conversation got the same reply | **HIGH** | 3/3 by API, twice in browser |
| **D2** | Helpful / Not helpful return **201** with **zero** visible acknowledgement (alerts `0→0`, page byte-identical) | **MEDIUM** | Twice, including an isolated probe |
| **D3** | Each mode switch / "New conversation" adds an ACTIVE session without ending the old one — counted **6→10 ACTIVE**, history then shows 10 identical "Active" rows | **MEDIUM** | Twice, counted via API |
| **D4** | Past conversations cannot be reopened — history rows are plain text, no link or action | **LOW** | Source + rendered page |
| **D5** | Difficulty (Easy/Normal/Challenge) has no observable effect — identical reply in all three | **LOW** | 3/3 |
| **D6** | `Suggested next step: Continue What is English?.` — malformed `?.` | **LOW** | Every session with a recommendation |
| **D7** | Session summary reports all-zero counters after a real exchange | **LOW** | Once — observed, not fully characterised |

**D1 is the one that matters.** It is not a crash; it is the feature failing at its purpose. It is also honestly scoped: with a provider key the external path would engage for Conversation / Lesson help / Free practice and the behaviour would change — **that path was not tested**, so the finding is "the tutor as configured is not responsive", not "the tutor can never be responsive".

**D2 is the only failing browser assertion in the run** (T29), and it was investigated separately rather than inferred.

---

## 4. Evidence

19 screenshots in `/home/user/evidence/p48/`. The most informative:

| File | Shows |
| --- | --- |
| `desktop-01-initial.png` | Initial screen: disclosure, level, 7 modes, empty state, disabled Send |
| `desktop-03-thinking.png` | Loading feedback mid-request |
| `desktop-05-followup.png` | **Key evidence** — correct alternation and labels, and two different student messages receiving the *identical* tutor reply (D1) |
| `desktop-07-history.png` | History listing the session |
| `desktop-10-history-many-active.png` | Ten indistinguishable "Active" rows (D3) |
| `desktop-10-ended.png` | Summary, "This is not a grade", End disabled |
| `desktop-12-daily-limit.png` | 429 surfaced as a visible alert |
| `probe-feedback.png` | Feedback clicked, no confirmation (D2) |
| `mobile375-01/02-*.png` | Mobile layout, no overflow |

Test scripts: `/tmp/pwt/final.mjs` (41 checks), `/tmp/pwt/hygiene.mjs` (session counting), `/tmp/pwt/probe2.mjs` (feedback/Voice isolation), `/tmp/pwt/rate.mjs` (429 in UI). All outside the repository.

---

## 5. Integrity

| Item | Status |
| --- | --- |
| `prisma/dev.db` SHA-256 | **UNCHANGED** — `e9b4eac1…fb02` |
| `package-lock.json` SHA-256 | **UNCHANGED** — `035df9a3…6b48` |
| `.env` SHA-256 | **UNCHANGED** — `6da80015…33cb` |
| Source/scripts files modified this phase | **0** (verified by mtime against the 06:18 re-provision; current time 06:28) |
| Browser packages in `package.json` | 0 — Playwright installed under `/tmp` only |
| Test writes | Disposable DB copies only (`/tmp/p48_*.db`); the `AiSetting` daily-limit change made for K6 was reverted on the copy |
| Phase 47 loading boundaries | Intact, unmodified |

---

## 6. Known limitations

1. **No provider-backed response verified** — the central limitation of this phase, stated in §1.
2. **Provider failure paths untested** — no 401/429/timeout from a provider could be induced.
3. **Dev mode only** — `next start` is unusable here (pre-existing, not worked around).
4. Behaviour with an external key for Conversation / Lesson help / Free practice is **unknown**; D1 and D5 may not apply there.
5. Two harness mistakes were made and corrected mid-phase (a toast container sharing `aria-live` with the chat region, and an `INACTIVE` seed account returning 403 that looked like a page failure). Both are recorded rather than quietly dropped; neither affected a final result.
6. Single browser, single tab, no concurrency testing.

---

## 7. Recommended next step

**Decide the tutor's provisioning before doing more UI work.** One question resolves most of what this phase could not test:

> Should this deployment run with an external provider (`AI_API_KEY`), or ship as a curriculum-only practice tool?

* **If a provider is intended** — the highest-value next task is a controlled provider validation with a key supplied by the operator: re-run the D1/D5 probes to see whether replies track the question and the difficulty, then tune the prompt. Every UI defect in this report (D2–D4) is worth fixing regardless, but none of them is why the feature under-delivers.
* **If curriculum-only is the intended product** — D1 becomes the top priority as a *product* problem, not a config problem: the fallback must at minimum relate to what the learner typed, and the chat screen should state plainly that it is course-based practice rather than an AI conversation (see U1). Otherwise the interface promises something the backend does not do.

Either way, the cheap fixes that need no decision are **D2** (acknowledge feedback — the toast system already exists) and **D3/D4** (end the previous session when starting a new one, and make history rows openable).

---

## 8. Phase boundary

**Phase 48 is complete.** No Phase 49 work was started. No fix was implemented, no redesign attempted, no schema, migration or dependency touched, and neither production nor organizational staging was contacted.
