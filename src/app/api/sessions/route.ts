import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { listSessions, revokeOtherSessions, revokeSession } from "@/lib/identity/sessions";

export const GET = apiRoute(async (req) => {
  const actor = await requireApiUser();
  const userId = new URL(req.url).searchParams.get("userId") ?? actor.id;
  return jsonOk(await listSessions(actor, userId));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { action?: string; sessionId?: string };
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (body.action === "revoke-others") {
    await revokeOtherSessions(actor.id, payload?.sid);
    return jsonOk({ ok: true });
  }
  if (!body.sessionId) return jsonOk({ error: "Choose a session." }, 422);
  return jsonOk(await revokeSession(actor, body.sessionId, payload?.sid));
});
