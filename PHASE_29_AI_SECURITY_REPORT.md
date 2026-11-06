# Phase 29 — AI Security Report

**Cross-user isolation, prompt injection, key exposure and quota tests:** NOT TESTED.

Static findings: tutor route requires STUDENT and passes current session user ID; service/session ownership must be checked at every read/write. The external provider uses server environment key, bounded message/history (last 8, each 500 chars; user message 500 chars), 300 tokens, 20s timeout, and context composed for that user. Key is not returned by this provider path. AI session message endpoint has no request-rate limiter detected; service code does enforce a per-student daily usage cap and per-session message cap, but these are not shown as concurrency-safe quotas and new-session opening is not shown to apply the same cap. Its request schema only specifies `z.string()` (no route-level max); downstream length checking occurs after JSON parsing, so request/body memory overhead remains. `AI_BASE_URL` is environment-controlled, not client-supplied; provider endpoint status is NOT VERIFIED.

Required STAGING tests: Student A session ID vs Student B; guessed history/session IDs; malicious prompt/system prompt probes; output-secret checks; request-size/token quotas; provider errors. No actual provider request made.
