/** Validate runtime configuration before accepting requests. Build-time static analysis is skipped. */
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV === "test") return;
  const { validateServerEnvironment } = await import("@/lib/server-env");
  validateServerEnvironment();
}
