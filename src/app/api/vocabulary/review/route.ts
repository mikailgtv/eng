import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { getDueVocabulary, getUpcomingVocabulary, countUpcomingVocabulary, recordVocabularyResponse } from "@/lib/practice";

// Always dynamic — reads the session from cookies.
export const dynamic = "force-dynamic";

/**
 * GET /api/vocabulary/review — vocabulary items currently due for review for
 * the CURRENT student (scheduling is stored in vocabulary_review.dueAt).
 */
export const GET = apiRoute(async (req: Request) => {
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const url = new URL(req.url);
  const wantUpcoming = url.searchParams.get("upcoming") !== null || url.searchParams.get("includeUpcoming") !== null;
  const items = await getDueVocabulary(viewer.id);
  if (!wantUpcoming) return jsonOk({ items });
  const [upcoming, upcomingCount] = await Promise.all([
    getUpcomingVocabulary(viewer.id, 20),
    countUpcomingVocabulary(viewer.id),
  ]);
  return jsonOk({ items, upcoming, upcomingCount });
});

const reviewSchema = z
  .object({
    vocabularyId: z.string().trim().min(1),
    response: z.enum(["KNOWN", "NEED_REVIEW"]),
  })
  .strict();

/**
 * POST /api/vocabulary/review — record the CURRENT student's self-assessment
 * for a vocabulary item and schedule its next review (data-driven).
 * The review row is always keyed to the session user — a student can never
 * create or modify another student's review state.
 */
export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const body = reviewSchema.parse(await parseJsonBody(req));

  // The vocabulary item must exist and be reachable through the student's
  // assigned courses (a random vocabularyId cannot inject review state).
  const vocabulary = await prisma.vocabulary.findFirst({
    where: {
      id: body.vocabularyId,
      lesson: {
        status: "PUBLISHED",
        module: {
          status: "PUBLISHED",
          course: {
            status: "PUBLISHED",
            level: { status: "ACTIVE" },
            ...(viewer.role === "ADMIN"
              ? {}
              : { assignments: viewer.groupId ? { some: { groupId: viewer.groupId } } : { none: {} } }),
          },
        },
      },
    },
    select: { id: true },
  });
  if (!vocabulary) throw new ApiError(404, "Vocabulary item not found in your courses.");

  const result = await recordVocabularyResponse(viewer.id, vocabulary.id, body.response);
  return jsonOk({ status: result.status, dueAt: result.dueAt, streak: result.streak });
});
