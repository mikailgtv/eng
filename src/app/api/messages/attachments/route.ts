import { ApiError, apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { saveAttachment } from "@/lib/communication/messages";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const form = await req.formData();
  const messageId = String(form.get("messageId") ?? "");
  const file = form.get("file");
  if (!messageId || !(file instanceof File)) throw new ApiError(400, "Choose a file.");
  const bytes = Buffer.from(await file.arrayBuffer());
  return jsonOk(await saveAttachment(user, messageId, { name: file.name, type: file.type, bytes }), 201);
});
