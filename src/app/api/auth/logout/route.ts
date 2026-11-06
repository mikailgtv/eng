import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySession, verifySessionToken } from "@/lib/auth";
import { apiRoute, jsonOk } from "@/lib/api";
import { recordSecurityEvent } from "@/lib/identity/security";

/** POST /api/auth/logout — clears the session cookie. Idempotent. */
export const POST = apiRoute(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  await destroySession();
  if (payload?.sub) await recordSecurityEvent("LOGOUT", { userId: payload.sub });
  return jsonOk({ ok: true });
});
