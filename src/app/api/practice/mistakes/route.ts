import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { getMistakesForStudent } from "@/lib/practice";

// Always dynamic — reads the session from cookies.
export const dynamic = "force-dynamic";

/**
 * GET /api/practice/mistakes?lessonId=… — the current student's latest
 * incorrect attempt per activity (optionally scoped to one lesson).
 * Always scoped to the session user.
 */
export const GET = apiRoute(async (req) => {
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const lessonId = new URL(req.url).searchParams.get("lessonId")?.trim() || undefined;
  const mistakes = await getMistakesForStudent(viewer.id, lessonId);
  return jsonOk({ mistakes });
});
