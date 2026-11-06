import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { acknowledgeNotification, archiveNotification, markNotificationsRead } from "@/lib/communication/hub";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { id?: string; all?: boolean; archive?: boolean; acknowledge?: boolean };
  if (body.acknowledge && body.id) return jsonOk({ acknowledged: await acknowledgeNotification(user.id, body.id) });
  if (body.archive && body.id) return jsonOk({ archived: await archiveNotification(user.id, body.id) });
  await markNotificationsRead(user.id, body.id, Boolean(body.all));
  return jsonOk({ ok: true });
});
