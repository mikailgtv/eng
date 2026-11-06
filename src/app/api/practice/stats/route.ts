import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { getPracticeStats, getVocabularyReviewCounts } from "@/lib/practice";

// Always dynamic — reads the session from cookies.
export const dynamic = "force-dynamic";

/**
 * GET /api/practice/stats — the current student's real practice statistics
 * (attempts, accuracy, listening/grammar/vocabulary counts). Every number is
 * derived from actual records — never fabricated.
 */
export const GET = apiRoute(async () => {
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const [stats, vocabulary] = await Promise.all([
    getPracticeStats(viewer.id),
    getVocabularyReviewCounts(viewer.id),
  ]);
  return jsonOk({ ...stats, vocabulary });
});
