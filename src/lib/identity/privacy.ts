const BLOCKED = new Set([
  "password",
  "passwordHash",
  "secret",
  "secretEnc",
  "token",
  "sessionToken",
  "mfa",
  "backupCodes",
  "employeeCode",
  "email",
  "phone",
]);

/** Remove identity secrets before any object is sent to an assistant. */
export function stripIdentitySecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripIdentitySecrets(item)) as T;
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (BLOCKED.has(key)) continue;
    out[key] = stripIdentitySecrets(item);
  }
  return out as T;
}
