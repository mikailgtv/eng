import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { listResultsForStaff } from "@/lib/assessment/queries";

// Always dynamic — reads the session from cookies.
export const dynamic = "force-dynamic";

/**
 * GET /api/results — staff result list with filters (group, assessment,
 * result, date range) and pagination. Teachers are scoped to their taught
 * groups SERVER-SIDE; admins see all.
 */
export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const sp = new URL(req.url).searchParams;
  const parseDate = (v: string | null) => (v ? new Date(v) : undefined);

  const data = await listResultsForStaff(
    { id: user.id, role: user.role, groupId: user.groupId },
    {
      groupId: sp.get("groupId") ?? undefined,
      assessmentId: sp.get("assessmentId") ?? undefined,
      result: sp.get("result") ?? undefined,
      from: parseDate(sp.get("from")),
      to: parseDate(sp.get("to")),
      page: Number(sp.get("page") ?? "1") || 1,
    }
  );
  return jsonOk(data);
});
