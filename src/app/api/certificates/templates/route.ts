import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { saveTemplate } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { name?: string; organizationName?: string; title?: string; footer?: string; showScore?: boolean; showLevel?: boolean; publicScore?: boolean; confirm?: boolean };
  assertConfirmed(body.confirm, undefined, false);
  if (!body.name || !body.organizationName || !body.title) throw new ApiError(400, "Enter a template name, organization, and title.");
  return jsonOk(await saveTemplate(user, {
    name: body.name,
    organizationName: body.organizationName,
    title: body.title,
    footer: body.footer,
    showScore: Boolean(body.showScore),
    showLevel: Boolean(body.showLevel),
    publicScore: Boolean(body.publicScore),
  }));
});
