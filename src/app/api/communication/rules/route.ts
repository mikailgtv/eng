import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { runDueReminders } from "@/lib/communication/reminders";

export const GET = apiRoute(async () => {
  await requireApiUser(["ADMIN"]);
  await runDueReminders().catch(() => undefined);
  const rules = await prisma.notificationRule.findMany({ orderBy: { eventKey: "asc" } });
  return jsonOk(rules);
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { eventKey?: string; enabled?: boolean; confirm?: boolean };
  if (body.confirm !== true || !body.eventKey) throw new ApiError(400, "Confirm the rule change.");
  const rule = await prisma.notificationRule.update({ where: { eventKey: body.eventKey }, data: { enabled: Boolean(body.enabled), updatedById: user.id } });
  await audit({ actorId: user.id, action: "NOTIFICATION_RULE_CHANGED", entityType: "COMMUNICATION", entityId: rule.id, metadata: { eventKey: rule.eventKey, enabled: rule.enabled } });
  return jsonOk({ eventKey: rule.eventKey, enabled: rule.enabled });
});
