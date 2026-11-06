import { ApiError, apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { saveContentMedia } from "@/lib/content/media";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  await assertStaffContent(user);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose a file.");
  const bytes = Buffer.from(await file.arrayBuffer());
  return jsonOk(await saveContentMedia(user, { name: file.name, type: file.type, bytes }, String(form.get("alt") ?? "")), 201);
});
