import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { listNotifications } from "@/lib/communication/hub";
import { runDueReminders } from "@/lib/communication/reminders";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser();
  await runDueReminders().catch(() => undefined);
  const url = new URL(req.url);
  return jsonOk(await listNotifications(user.id, {
    category: url.searchParams.get("category") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    take: Number(url.searchParams.get("take") ?? "20"),
    cursor: url.searchParams.get("cursor") ?? undefined,
  }));
});
