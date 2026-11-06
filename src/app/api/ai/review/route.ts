import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { listReviewItems, publishItem, reviewItem } from "@/lib/ai/review";

const schema = z.object({
  itemId: z.string().min(1),
  action: z.enum(["approve", "reject", "publish"]),
  prompt: z.string().max(400).optional(),
}).strict();

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const items = await listReviewItems({ id: user.id, role: user.role });
  return jsonOk({ items });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const viewer = { id: user.id, role: user.role };
  if (body.action === "publish") {
    const activity = await publishItem(viewer, body.itemId);
    return jsonOk({ activityId: activity.id });
  }
  const item = await reviewItem(viewer, body.itemId, { status: body.action === "approve" ? "APPROVED" : "REJECTED", prompt: body.prompt });
  return jsonOk({ id: item.id, status: item.status });
});
