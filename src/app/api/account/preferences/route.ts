import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { updateOwnPreferences } from "@/lib/identity/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { preferredLanguage?: string; timezone?: string; aiAssistance?: boolean; showTranslations?: boolean; learningPreferences?: string };
  return jsonOk(await updateOwnPreferences(actor, body));
});
