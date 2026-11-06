import { NextResponse } from "next/server";
import { ApiKeyService } from "@/lib/integrations/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await ApiKeyService.authenticateRequest(req.headers);
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }
  if (auth.rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(auth.retryAfterSeconds || 60) } });
  }

  if (!ApiKeyService.hasScope(auth, "learning_records:read")) {
    return NextResponse.json({ error: "Forbidden: scope 'learning_records:read' required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  if (!auth.organizationId) return NextResponse.json({ error: "API client has no organization scope" }, { status: 403 });
  const attempts = await prisma.assessmentAttempt.findMany({
    take: limit,
    where: { submittedAt: { not: null }, student: { organizationId: auth.organizationId } },
    orderBy: { submittedAt: "desc" },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      assessment: {
        select: {
          id: true,
          title: true,
          type: true,
        },
      },
    },
  });

  // Map to xAPI statements format
  const statements = attempts.map((att) => ({
    id: att.id,
    actor: {
      name: `${att.student?.firstName || ""} ${att.student?.lastName || ""}`.trim(),
      mbox: `mailto:${att.student?.email || "unknown@corp.example"}`,
    },
    verb: {
      id: att.passed ? "http://adlnet.gov/expapi/verbs/passed" : "http://adlnet.gov/expapi/verbs/failed",
      display: { "en-US": att.passed ? "passed" : "failed" },
    },
    object: {
      id: `https://lms.englishbridge.org/assessments/${att.assessment.id}`,
      definition: {
        name: { "en-US": att.assessment.title },
        type: "http://adlnet.gov/expapi/activities/assessment",
      },
    },
    result: {
      score: {
        raw: att.score,
        scaled: att.percentage ? att.percentage / 100 : 0,
      },
      success: att.passed,
      completion: true,
    },
    timestamp: att.submittedAt?.toISOString(),
  }));

  return NextResponse.json({
    statements,
    meta: {
      count: statements.length,
      limit,
    },
  });
}
