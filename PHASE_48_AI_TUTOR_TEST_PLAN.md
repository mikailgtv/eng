# Phase 48 — AI Tutor Test Plan

**Objective:** determine what a learner can actually do in the AI Tutor, what works end to end, what is incomplete, and what prevents successful use.
**Nature:** product validation. Read-only — no fixes, no redesign, no schema/dependency changes.

| Item | Value |
| --- | --- |
| Runtime | Node **v22.23.3** (repo-pinned runtime, `setup-node.mjs` EXIT=0) |
| Server | `next dev -p 4049` (Next 15.5.27) |
| Database | **`/tmp/p48_final.db`** — byte copy of `prisma/dev.db`; fresh copy per run |
| Browser | `playwright-core` 1.64.1 + Chrome Headless Shell 156, **under `/tmp` only** |
| Evidence | `/home/user/evidence/p48/` (19 screenshots) |

---

## 1. Provider and environment prerequisites

The tutor has two execution paths, resolved in `src/lib/ai/service.ts:172`:

```ts
if (STRUCTURED.has(mode) || opening || !externalTutorConfigured()) return curriculumReply(...)
```

| Requirement | Status in this environment |
| --- | --- |
| `AI_API_KEY` | **ABSENT** from `.env` → `externalTutorConfigured()` is false |
| `AI_BASE_URL` | not set (defaults to `https://api.openai.com/v1`) |
| `AI_MODEL` | not set (defaults to `gpt-4o-mini`) |
| Documented in `.env.example` | yes — `AI_API_KEY=`, `AI_BASE_URL=`, `AI_MODEL=` |
| Database-level tutor settings (`AiSetting`) | present, defaults apply (enabled=true, dailyRequestLimit=40, maxResponseChars=800, maxInputChars=500) |

**Consequence, established before testing:** this environment cannot produce a provider-backed AI response. No credential was invented, and no successful AI response was mocked inside the application. What the learner gets here is the **local curriculum fallback**, which advertises itself honestly:

* API payloads carry `"provider":"curriculum"` and `providerConfigured:false`.
* `/admin/ai` states: *"External tutor is not configured. Practice uses course content on this server."*

Two truths must therefore be kept apart throughout this phase:
1. The **interface and conversation mechanics** can be tested fully — and were.
2. The **AI answer quality** cannot be tested at all — only the offline fallback's behaviour was observed.

---

## 2. Routes and components under test

| Route / endpoint | Role |
| --- | --- |
| `/student/tutor` | The tutor screen (`TutorChat`) |
| `/student/tutor/history` | "Your practice sessions" list |
| `POST /api/ai/sessions` | Start a session, returns the opening message |
| `POST /api/ai/sessions/[id]/messages` | SSE stream: `thinking` → `delta…` → `done` |
| `POST /api/ai/sessions/[id]/end` | End and summarize |
| `POST /api/ai/feedback` | Helpful / Not helpful |
| `GET /api/ai/sessions` | List own sessions (used to count ACTIVE sessions) |
| `/admin/ai` | Operator view of provider configuration |

### Controls that exist (confirmed in `src/components/ai/tutor-chat.tsx`)

7 mode buttons · Difficulty select · "Show translation hints" checkbox · message composer · **Send** · **Voice** · 4 suggested prompts · **New conversation** · **End and summarize** · **Helpful** / **Not helpful**.

**Controls that do not exist** (recorded so absence is not mistaken for breakage): retry/regenerate, clear history, delete session, rename, open a past session from history, export, attachments, mic input.

---

## 3. Test cases

### A. Entry and initial state
| ID | Case | Expected |
| --- | --- | --- |
| T01 | Dashboard exposes the Tutor | A link to `/student/tutor` exists |
| T02 | Navigate in-app | Lands on `/student/tutor` |
| T03 | Disclosure | "AI Practice, not a teacher and not an exam" is visible |
| T04 | Level shown | Learner's level, or an explicit "Not assessed yet" |
| T05 | Empty state | "Choose a practice mode to begin." |
| T06 | Modes | 7 buttons present |
| T07 | Empty composer | Send disabled |
| T08 | Suggested prompts before a session | Disabled |

### B–C. Start, submit, loading, rendering
| ID | Case | Expected |
| --- | --- | --- |
| T09 | Start a mode | An opening tutor message appears |
| T10 | Submit a short question | User message appears immediately |
| T11 | Loading feedback | "Thinking…" shown while awaiting the reply |
| T12 | Reply rendered | Assistant message appears |

### D–F. Context, edge inputs
| ID | Case | Expected |
| --- | --- | --- |
| T13 | Follow-up | Prior turns still on screen |
| T14 | Ordering | Tutor → You → Tutor → You → Tutor |
| T15 | Whitespace-only message | Send stays disabled |
| T16 | In-flight state | Send disabled during the request |
| T17 | Rapid double submit | Message not duplicated |
| T18 | Long prompt (263 chars) | Accepted by the composer |
| T19 | Long prompt sent | Submitted and answered |

### G. Persistence
| ID | Case | Expected |
| --- | --- | --- |
| T20 | History page | Lists the session |
| T21 | Leave and return | Transcript restored |
| T22 | Full reload | Transcript restored |
| T23 | Fidelity | Restored transcript equals what was on screen |

### H. Controls
| ID | Case | Expected |
| --- | --- | --- |
| T24 | New conversation | Transcript resets |
| T25 | Suggested prompt | Submits and is answered |
| T26 | Mode switch | Fresh transcript |
| T27 | Feedback controls render | Present while a session is active |
| T28 | Feedback reaches the server | Request returns 201 |
| T29 | Feedback acknowledged in UI | Some visible confirmation |
| T30 | Voice | Explains it is unavailable, no silent failure |
| T31 | End and summarize | Summary shown, explicitly not a grade |
| T32 | End afterwards | Disabled |
| T33 | Retry / clear history | Absent by design |

### I–J. Translation, mobile
| ID | Case | Expected |
| --- | --- | --- |
| T34 | Console cleanliness (desktop) | No errors |
| T35 | Translation toggle (PRE_A1) | Reply changes |
| T36 | Translation hint visible | Additional hint text |
| T37–T41 | 375 px: overflow, exchange, composer, overflow after, console | All clean |

### K. API-level edge cases (curl, disposable DB)
| ID | Case | Expected |
| --- | --- | --- |
| K1 | Empty message | 422 with a clear message |
| K2 | Message > 500 chars | 422 naming the limit |
| K3 | Unknown session id | 404 |
| K4 | Another student's session | 404, no leakage |
| K5 | Message after end | 422 "session has ended" |
| K6 | Daily limit reached | 429, surfaced in the UI, composer still usable |
| K7 | Admin provider disclosure | States the provider is not configured |

### L. Response-quality probes (informational, not pass/fail)
| ID | Case |
| --- | --- |
| L1 | Three unrelated learning questions → are replies distinct? |
| L2 | Same question at EASY / NORMAL / CHALLENGE → do replies differ? |
| L3 | How many ACTIVE sessions does repeated mode switching create? |

---

## 4. Limitations — stated up front

1. **No provider-backed AI response was verified.** No `AI_API_KEY`; fabricating one is forbidden. Every reply observed came from the local curriculum fallback, and is labelled as such.
2. **Provider failure behaviour is untested** — a 401/429/timeout from an external provider cannot be induced without a provider. The fallback's *wording* ("English Tutor is temporarily unavailable…") was read in source but never observed.
3. **STRUCTURED modes** (Vocabulary, Grammar, Quiz, Mistake review) never call an external provider by design, so they would be unaffected by adding a key. Only Conversation, Lesson help and Free practice would change.
4. Development-mode only; `next start` is unusable in this sandbox (pre-existing).
5. Single-browser, single-session testing. No concurrency test (two tabs).
6. The seed database contains **no prior tutor sessions**, so history growth was created during testing on a disposable copy.
