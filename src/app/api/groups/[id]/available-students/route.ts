import { prisma } from "@/lib/prisma";
import { apiRoute, requireApiUser } from "@/lib/api";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/groups/[id]/available-students?q=…
 * ADMIN-only search used by the "assign members" picker: returns up to 8
 * students matching the query with their current group (so the UI can warn
 * when assigning will MOVE a student between groups).
 */
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  await requireApiUser(["ADMIN"]);
  const { id } = ctx.params;

  const q = new URL(_req.url).searchParams.get("q")?.trim() ?? "";
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      groupId: { not: id },
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { employeeCode: { contains: q } },
              { username: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      username: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 8,
  });

  return Response.json({
    data: students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      employeeCode: s.employeeCode,
      currentGroup: s.group?.name ?? null,
    })),
  });
});
