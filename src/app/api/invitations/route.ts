import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createInvitation } from "@/lib/identity/service";
import { requirePermission } from "@/lib/identity/permissions";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  await requirePermission(actor, "invitations.manage");
  const rows = await prisma.userInvitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, email: true, role: true, expiresAt: true, usedAt: true, revokedAt: true, createdAt: true, groupId: true },
  });
  return jsonOk(rows);
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { email: string; role: "STUDENT" | "TEACHER" | "ADMIN"; accessRoleKey?: string; groupId?: string; departmentId?: string; employeeCode?: string; firstName?: string; lastName?: string };
  return jsonOk(await createInvitation(actor, body), 201);
});
