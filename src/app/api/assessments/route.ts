import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { isAssessmentType } from "@/lib/assessment/registry";
import { assessmentInput } from "@/lib/assessment/schemas";
import { listAssessmentsForStaff } from "@/lib/assessment/queries";
import type { Viewer } from "@/lib/assessment/engine";

/**
 * GET /api/assessments — staff list with status/question counts.
 */
export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const rows = await listAssessmentsForStaff({ id: user.id, role: user.role, groupId: user.groupId });
  return jsonOk({ assessments: rows });
});

/**
 * POST /api/assessments — create an assessment (DRAFT by default).
 * Scope references (course/level/module) are verified server-side.
 */
export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  const payload = assessmentInput.parse(await parseJsonBody(req));
  if (!isAssessmentType(payload.type)) throw new ApiError(422, "Assessment type must be QUIZ or EXAM.");
  if (!payload.courseId && !payload.levelId && !payload.moduleId) {
    throw new ApiError(422, "Choose a course, level or module for this assessment.");
  }
  await assertScopeExists(payload);

  const created = await prisma.assessment.create({
    data: {
      title: payload.title,
      description: payload.description,
      type: payload.type,
      courseId: payload.courseId || null,
      levelId: payload.levelId || null,
      moduleId: payload.moduleId || null,
      durationMinutes: payload.durationMinutes ?? null,
      passingScore: payload.passingScore,
      maxAttempts: payload.maxAttempts ?? null,
      randomizeQuestions: payload.randomizeQuestions,
      randomizeOptions: payload.randomizeOptions,
      showResults: payload.showResults,
      showCorrectAnswers: payload.showCorrectAnswers,
      allowNavigation: payload.allowNavigation,
      status: payload.status,
      startAt: payload.startAt ? new Date(payload.startAt) : null,
      endAt: payload.endAt ? new Date(payload.endAt) : null,
      createdById: user.id,
    },
    select: { id: true },
  });
  await audit({
    actorId: user.id,
    action: "ASSESSMENT_CREATED",
    entityType: "ASSESSMENT",
    entityId: created.id,
    metadata: { type: payload.type, title: payload.title },
    ipAddress: clientIp(req),
  });
  return jsonOk({ id: created.id }, 201);
});

async function assertScopeExists(payload: { courseId?: string; levelId?: string; moduleId?: string }) {
  if (payload.courseId) {
    const c = await prisma.course.findUnique({ where: { id: payload.courseId }, select: { id: true } });
    if (!c) throw new ApiError(422, "Selected course does not exist.");
  }
  if (payload.levelId) {
    const l = await prisma.level.findUnique({ where: { id: payload.levelId }, select: { id: true } });
    if (!l) throw new ApiError(422, "Selected level does not exist.");
  }
  if (payload.moduleId) {
    const m = await prisma.module.findUnique({ where: { id: payload.moduleId }, select: { id: true } });
    if (!m) throw new ApiError(422, "Selected module does not exist.");
  }
}
