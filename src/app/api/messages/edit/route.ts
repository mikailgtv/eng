import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { deleteMessage, editMessage } from "@/lib/communication/messages";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { id?: string; body?: string; delete?: boolean; confirm?: boolean };
  if (!body.id || body.confirm !== true) throw new ApiError(400, "Confirm this message change.");
  if (body.delete) return jsonOk(await deleteMessage(user, body.id));
  if (!body.body) throw new ApiError(400, "Enter the edited message.");
  return jsonOk(await editMessage(user, body.id, body.body));
});
