import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createDelegation } from "@/lib/identity/service";
import { requirePermission } from "@/lib/identity/permissions";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  await requirePermission(actor, "delegations.manage");
  return jsonOk(await prisma.delegation.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { fromUser: { select: { firstName: true, lastName: true } }, toUser: { select: { firstName: true, lastName: true } } } }));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { fromUserId: string; toUserId: string; endsAt: string; permissionKey?: string; roleKey?: string; reason: string; scopeType?: string; scopeId?: string | null };
  return jsonOk(await createDelegation(actor, body), 201);
});
