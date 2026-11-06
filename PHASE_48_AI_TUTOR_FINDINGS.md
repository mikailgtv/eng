# Phase 48 — AI Tutor Findings

Evidence base: 41 browser checks (40 passed), 7 API-level checks, 3 informational probes, 19 screenshots in `evidence/p48/`.
**No implementation change was made in this phase.**

---

## 0. The headline

The tutor **interface is complete and works end to end**: entry, modes, sending, streaming, persistence across navigation *and* reload, mode switching, ending with a summary, mobile layout, and error handling all behaved correctly.

The **tutor itself does not tutor** in this environment. With no AI provider configured, the server returns a deterministic curriculum fallback that ignores what the student wrote — three unrelated English questions produced the identical reply, and so did repeated questions in one conversation. This is a configuration consequence, not a crash, and the app is honest about it on `/admin/ai` — but a learner looking at the chat screen is not told.

| | |
| --- | --- |
| Interface and conversation mechanics | **WORKS** (40/41 checks) |
| Real AI answers | **NOT TESTED — no provider configured** |
| Offline fallback answers | **WORKS as designed, but not responsive to the question** |

---

## 1. Confirmed working behaviours

### Journey and initial state
| # | Behaviour | Evidence |
| --- | --- | --- |
| W1 | The student dashboard links to the Tutor and in-app navigation reaches `/student/tutor` | T01, T02 |
| W2 | The screen discloses "AI Practice, not a teacher and not an exam" | T03 · `desktop-01-initial.png` |
| W3 | The learner's level is shown — `B1` for an assessed student, "Not assessed yet" for an unassessed one | T04 |
| W4 | Empty state reads "Choose a practice mode to begin." | T05 |
| W5 | 7 practice modes are offered as a labelled button group | T06 |
| W6 | Send is disabled while the composer is empty or whitespace-only | T07, T15 |
| W7 | Suggested prompts are disabled until a session exists | T08 |

### Sending, streaming and order
| # | Behaviour | Evidence |
| --- | --- | --- |
| W8 | Starting a mode immediately produces a personalised opening ("Hello Daniel. What would you like to talk about today?") | T09 · `desktop-02-session-started.png` |
| W9 | The user's message renders **optimistically within ~107 ms**, before the server responds | T10 |
| W10 | A "Thinking…" indicator appears while waiting | T11 · `desktop-03-thinking.png` |
| W11 | The reply streams in and renders correctly | T12 · `desktop-04-replied.png` |
| W12 | Follow-ups keep the earlier conversation on screen | T13 |
| W13 | Message order is correct and alternates `TUTOR>YOU>TUTOR>YOU>TUTOR` | T14 · `desktop-05-followup.png` |
| W14 | Send is disabled while a request is in flight, and a forced rapid double-click does **not** duplicate the message | T16, T17 |
| W15 | A 263-character prompt is accepted and answered | T18, T19 · `desktop-06-long-prompt.png` |

### Persistence
| # | Behaviour | Evidence |
| --- | --- | --- |
| W16 | The session is listed on `/student/tutor/history` as Active | T20 · `desktop-07-history.png` |
| W17 | The conversation is restored after navigating away and back **and after a full reload**, character-for-character identical to what was on screen | T21, T22, T23 |

### Controls
| # | Behaviour | Evidence |
| --- | --- | --- |
| W18 | "New conversation" resets the transcript | T24 |
| W19 | A suggested prompt submits and is answered | T25 |
| W20 | Switching mode starts a fresh transcript | T26 · `desktop-08-mode-switch.png` |
| W21 | "End and summarize" returns a summary and explicitly says "This is not a grade"; End then disables | T31, T32 · `desktop-10-ended.png` |
| W22 | "Voice" states "Voice recognition is unavailable. Type instead." — no silent failure | T30 · `desktop-09-voice-notice.png` |
| W23 | No retry/clear-history controls exist, so none can be misleadingly present | T33 |

### Error handling (API and UI)
| # | Behaviour | Evidence |
| --- | --- | --- |
| W24 | Empty message → **422** "Write a message before sending." | K1 |
| W25 | Message > 500 chars → **422** "Keep the message under 500 characters." | K2 |
| W26 | Unknown session → **404** "Session not found." | K3 |
| W27 | Another student's session → **404**, no cross-student leakage | K4 |
| W28 | Message after the session ended → **422** "This practice session has ended. Start a new one." | K5 |
| W29 | Daily limit → **429**, rendered as a visible alert, and the composer stays usable so the learner is not trapped | K6 · `desktop-12-daily-limit.png` |

### Layout, i18n and hygiene
| # | Behaviour | Evidence |
| --- | --- | --- |
| W30 | No console or page errors across the whole desktop journey | T34 |
| W31 | No console errors on mobile | T41 |
| W32 | The translation toggle changes the rendered reply for a PRE_A1 learner, adding hint text | T35, T36 · `desktop-11-translation-on.png` |
| W33 | 375 px: no horizontal overflow before *or* after a conversation; composer visible; exchange works | T37–T40 · `mobile375-01-initial.png`, `mobile375-02-conversation.png` |

---

## 2. Confirmed defects

### D1 — Tutor replies do not respond to what the learner writes · **HIGH**
* **Route/component:** `/student/tutor` → `POST /api/ai/sessions/[id]/messages` → `curriculumReply()` in `src/lib/ai/service.ts`
* **Repro:**
  1. Sign in as a student, open `/student/tutor`, choose **Conversation**.
  2. Send "What is a good way to greet someone?"
  3. Send "Can you explain the difference between make and do?"
  4. Send "How do I form the past tense of go?"
* **Expected (per the product's own promise):** the assistant responds to the question asked; it presents itself as a "Practice assistant" that helps with English, and `/admin/ai` describes the offline path as practice "from your course".
* **Actual:** all three distinct questions returned the **byte-identical** reply:
  `Good. What is this?` / `hello`
  In a separate in-product conversation, two different student turns each received the identical reply *"Good. Tell me one more sentence about your day. I will correct only the most important mistake."* — visible side by side in `desktop-05-followup.png`.
* **Severity:** **High.** Not a crash and not data loss, but it defeats the feature's purpose: a learner asking for help receives text unrelated to the question. It is the single biggest barrier to the tutor being useful.
* **Root cause (verified in source and payload):** `produceReply` returns `curriculumReply(...)` whenever `!externalTutorConfigured()` — here always, because `AI_API_KEY` is unset. The reply is a scripted turn from a state machine, not an answer. API responses carry `"provider":"curriculum"`.
* **Reproduced:** yes, repeatedly — 3/3 questions by API, and in the browser twice.
* **Scope note that keeps this honest:** with a provider key present, Conversation / Lesson help / Free practice would take the external path and this behaviour would change. **That path was not tested.** The finding is therefore *"the tutor as configured is not responsive"*, not *"the tutor can never be responsive"*.

### D2 — Feedback buttons give no confirmation · **MEDIUM**
* **Route/component:** `/student/tutor`, "Helpful" / "Not helpful" → `POST /api/ai/feedback`
* **Repro:** open an active session → click **Not helpful**.
* **Expected:** some acknowledgement, or a persistent state showing the rating was recorded (the app has a toast system in use elsewhere).
* **Actual:** the request succeeds (**HTTP 201**), but the alert list stays `0 → 0`, the page body is byte-identical before and after, and the button remains unchanged. The learner cannot tell whether the click registered.
* **Severity:** **Medium** — silent success on a control whose whole purpose is to collect a signal. Users will click repeatedly or assume it is broken.
* **Reproduced:** yes — isolated probe (`probe-feedback.png`) and again in the main run (T28 pass / T29 fail).

### D3 — Every mode switch or "New conversation" creates another ACTIVE session and orphans the previous one · **MEDIUM**
* **Route/component:** `/student/tutor` → `POST /api/ai/sessions`; `/student/tutor/history`
* **Repro:** start Conversation → switch to Grammar → click "New conversation" → switch to Vocabulary. Then open `/student/tutor/history`.
* **Expected:** a conversation that is replaced should be ended (and labelled as such), so history stays meaningful.
* **Actual:** ACTIVE session count went **6 → 7 → 8 → 9 → 10** with no session ever ended; the history page then shows **10 rows all marked "Active"** with the same timestamp, indistinguishable from one another. Only the newest is ever reachable — `/student/tutor` loads the most recent ACTIVE session — so the others are orphaned permanently.
* **Severity:** **Medium** — the history screen becomes unusable, and the "Active" label becomes untrue for nine of ten rows.
* **Reproduced:** yes, twice (counted via `GET /api/ai/sessions`; `desktop-10-history-many-active.png`). Contributing factor: the browser tests themselves generated sessions, so the seed DB was reset per run and the sequence counted from a clean state.

### D4 — Past conversations cannot be reopened · **LOW**
* **Route/component:** `/student/tutor/history`
* **Repro:** create two conversations, open history, try to open the older one.
* **Expected:** with a page titled "Your practice sessions", rows would open the conversation.
* **Actual:** each row is a plain `<li>` with text only — no link or action. Combined with D3 and with "New conversation" silently discarding the transcript, a conversation becomes unreachable as soon as it is replaced.
* **Severity:** **Low** (missing capability rather than a broken control), but it removes the point of keeping history.
* **Reproduced:** yes — read from source (no `Link` in the list) and confirmed in the rendered page.

### D5 — The Difficulty selector changes nothing observable · **LOW**
* **Route/component:** `/student/tutor`, Difficulty select
* **Repro:** ask "What is a good way to greet someone?" in three separate sessions at EASY, NORMAL and CHALLENGE.
* **Expected:** a control labelled Difficulty should alter the practice.
* **Actual:** all three returned the identical reply `Good. How are you?`
* **Severity:** **Low** in this environment — plausibly because the fallback ignores difficulty; with a provider, difficulty is passed to the prompt and *may* matter (**untested**). Recorded as "no observed effect", which is all the evidence supports.
* **Reproduced:** yes, 3/3.

### D6 — Suggested-next-step string is malformed · **LOW**
* **Repro:** open `/student/tutor` for a student with a recommendation.
* **Actual:** renders as `Suggested next step: Continue What is English?.` — a question title ending in `?` concatenated into a sentence, leaving `?.`.
* **Severity:** **Low**, cosmetic. Reproduced in every session that had a recommendation.

### D7 — Summary counters report zero after a real practice session · **LOW**
* **Repro:** run a Grammar session, exchange messages, click **End and summarize**.
* **Actual:** "Vocabulary practiced: 0. Grammar: —. Corrections noted: 0." — even though messages had been exchanged, and Grammar mode reported "No grammar concept is stored for your current lesson."
* **Severity:** **Low.** The summary is honestly labelled "not a grade", but all-zero counters make it look broken. Observed once; the fallback may genuinely produce nothing to count.
* **Reproduced:** once (not re-attempted across modes) — recorded as **observed, not fully characterised**.

---

## 3. Missing or unavailable capabilities

| Capability | Status |
| --- | --- |
| Provider-backed AI answers | **Unavailable** — `AI_API_KEY` not set. Exact prerequisite: set `AI_API_KEY` (and optionally `AI_BASE_URL`, `AI_MODEL`) in the server environment. Never attempted, never faked. |
| Provider-failure handling (401/429/timeout) | **Untested** — cannot be induced without a provider. Fallback wording exists in source only. |
| Voice input | **Not implemented** — the button admits this explicitly (W22). Not a defect. |
| Retry/regenerate, clear history, delete session, attachments, export | **Not implemented** — no controls exist (W23). Absence noted, not scored as a bug. |

---

## 4. UX observations (clearly separated from bugs)

Not defects — product judgement calls for a later decision.

| # | Observation |
| --- | --- |
| U1 | The chat screen never tells the learner that no AI provider is configured. Only `/admin/ai` says so. A student cannot distinguish "the tutor is thinking about my English" from "the tutor is not answering me at all". A one-line notice would set honest expectations. |
| U2 | The Suggested-next-step banner ("Continue What is English?") reads like navigation but is plain text, not clickable. |
| U3 | Mode buttons double as "start a new session" with no warning that the current transcript will be replaced (see D3/D4). A confirm, or auto-ending the previous session, would prevent the pile-up. |
| U4 | "Helpful / Not helpful" appear only for the latest assistant turn and vanish once the session ends, which is a reasonable pattern — but without acknowledgement (D2) they feel dead. |
| U5 | The composer is sticky and works well on mobile; the layout held at 375 px with no overflow. This is a genuinely good piece of interface work. |
| U6 | The "Thinking…" state is text-only. It is honest and accessible (`aria-live`), though a slow provider (20 s timeout in source) would leave it on screen a long time. |

---

## 5. What prevents successful use — summary

1. **No AI provider configured** (blocking for real tutoring; `AI_API_KEY` absent).
2. **The offline fallback ignores the question** (D1) — so even the degraded experience does not function as a tutor.
3. **No visible signal of feedback success** (D2) and **session/history hygiene** (D3/D4) — secondary, but they erode trust in the surrounding controls.
