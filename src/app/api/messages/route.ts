import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { conversationDetail, listConversations, sendMessage, sendToGroup, teacherContacts } from "@/lib/communication/messages";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversation");
  if (conversationId) return jsonOk(await conversationDetail(user, conversationId));
  return jsonOk({ conversations: await listConversations(user), contacts: await teacherContacts(user) });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { recipientId?: string; groupId?: string; body?: string; confirm?: boolean };
  if (!body.body) throw new ApiError(400, "Enter a message.");
  if (body.groupId) {
    if (user.role === "STUDENT") throw new ApiError(403, "Students cannot message a whole group.");
    if (body.confirm !== true) throw new ApiError(400, "Confirm this group message.");
    return jsonOk(await sendToGroup(user, body.groupId, body.body), 201);
  }
  if (!body.recipientId) throw new ApiError(400, "Choose a recipient.");
  return jsonOk(await sendMessage(user, { recipientId: body.recipientId, body: body.body }), 201);
});
