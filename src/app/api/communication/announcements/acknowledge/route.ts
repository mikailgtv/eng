import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { acknowledgeAnnouncement } from "@/lib/communication/announcements";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { id?: string; confirm?: boolean };
  if (body.confirm !== true || !body.id) throw new ApiError(400, "Confirm the acknowledgement.");
  return jsonOk(await acknowledgeAnnouncement(user, body.id));
});
