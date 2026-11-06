/**
 * Minimal in-memory rate limiter for the login endpoint.
 *
 * Phase 1 scope: single-instance, in-memory (resets on restart). For
 * multi-instance production deployments this should move to a shared store
 * (e.g. Redis) — noted in the Phase 1 report as a known limitation.
 */
type Attempt = { count: number; resetAt: number };

const MAX_FAILURES = 5;
const WINDOW_MS = 5 * 60 * 1000;

const globalForLimiter = globalThis as unknown as { __ebLoginAttempts?: Map<string, Attempt> };
const attempts: Map<string, Attempt> = globalForLimiter.__ebLoginAttempts ?? new Map();
globalForLimiter.__ebLoginAttempts = attempts;

function sweep() {
  const now = Date.now();
  attempts.forEach((attempt, key) => {
    if (attempt.resetAt <= now) attempts.delete(key);
  });
}

export class LoginRateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many failed sign-in attempts. Please try again in a few minutes.");
  }
}

export function assertLoginAllowed(key: string) {
  sweep();
  const attempt = attempts.get(key);
  if (attempt && attempt.count >= MAX_FAILURES) {
    const retryAfterSeconds = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
    throw new LoginRateLimitError(retryAfterSeconds);
  }
}

export function recordLoginFailure(key: string) {
  sweep();
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    attempt.count += 1;
  }
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

// Phase 32: MFA brute-force protection
const MFA_MAX_FAILURES = 5;
const MFA_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const globalForMfaLimiter = globalThis as unknown as { __ebMfaAttempts?: Map<string, Attempt> };
const mfaAttempts: Map<string, Attempt> = globalForMfaLimiter.__ebMfaAttempts ?? new Map();
globalForMfaLimiter.__ebMfaAttempts = mfaAttempts;

function sweepMfa() {
  const now = Date.now();
  mfaAttempts.forEach((attempt, key) => {
    if (attempt.resetAt <= now) mfaAttempts.delete(key);
  });
}

export class MfaRateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many failed verification attempts. Please try again later.");
  }
}

export function assertMfaAllowed(key: string) {
  sweepMfa();
  const attempt = mfaAttempts.get(key);
  if (attempt && attempt.count >= MFA_MAX_FAILURES) {
    const retryAfterSeconds = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
    throw new MfaRateLimitError(retryAfterSeconds);
  }
}

export function recordMfaFailure(key: string) {
  sweepMfa();
  const now = Date.now();
  const attempt = mfaAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    mfaAttempts.set(key, { count: 1, resetAt: now + MFA_WINDOW_MS });
  } else {
    attempt.count += 1;
  }
}

export function clearMfaFailures(key: string) {
  mfaAttempts.delete(key);
}

