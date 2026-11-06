import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { runDueReminders } from "@/lib/communication/reminders";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  await requireApiUser(["ADMIN"]);
  return jsonOk(await runDueReminders(true));
});
