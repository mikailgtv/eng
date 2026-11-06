import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { searchMessages } from "@/lib/communication/messages";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  return jsonOk(await searchMessages(user, {
    q: url.searchParams.get("q") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  }));
});
