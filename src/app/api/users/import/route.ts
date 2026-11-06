import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { confirmImport, previewImport } from "@/lib/identity/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { action?: string; csv?: string; token?: string; confirm?: boolean };
  if (body.action === "confirm" && body.token) return jsonOk(await confirmImport(actor, body.token, Boolean(body.confirm)));
  if (!body.csv) throw new ApiError(422, "Paste a CSV file to preview.");
  return jsonOk(await previewImport(actor, body.csv));
});
