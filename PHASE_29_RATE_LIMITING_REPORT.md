# Phase 29 — Rate Limiting Report

**Live throttling tests:** NOT TESTED.

| Surface | Static control | Risk/status |
|---|---|---|
| Login | 5 in-memory failures / 5 min per IP+identifier, DB failure lockout and progressive delay | Process-local; IP trusts `x-forwarded-for`, proxy behavior NOT VERIFIED |
| Password reset / invitation | In-memory `assertIdentityRate` calls | Process-local; state NOT SHARED across instances |
| MFA verify / OTP | No verification attempt limiter detected in `/api/mfa` or `verifyMfaCode` | **HIGH**: six-digit email OTP/TOTP attempt brute force exposure; no tests |
| AI tutor | No short-window request limiter found on message submission route; service has daily per-student and per-session caps | MEDIUM: limits may be concurrency-racy; session-start quota and shared enforcement NOT VERIFIED |
| STT/TTS/voice | No endpoint limiter/quota in inspected route/provider path | MEDIUM; STT accepts base64 up to 2 MB, provider call can cost/consume resources |
| Integrations API keys | Per-client in-memory map, configured requests/minute | Process-local; no shared-store behavior tested |
| Upload | Byte caps and some content rate limiter for builder; not all upload endpoints | Provider/body memory limits NOT VERIFIED |
| Exam submission | Server guards/idempotency; no general rate limit detected | Repeated requests may still consume compute; mutation tests NOT RUN |
| Messaging | No general send limiter detected | Spam/notification load risk NOT MEASURED |

Maps are process-local; scaling/restarts can reset quotas. Some maps are not centrally swept. Validate proxy-derived client identity and enforce shared quotas for auth/OTP, AI, voice, upload and messaging.
