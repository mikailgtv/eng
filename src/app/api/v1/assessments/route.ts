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

  if (!ApiKeyService.hasScope(auth, "assessments:read")) {
    return NextResponse.json({ error: "Forbidden: scope 'assessments:read' required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  if (!auth.organizationId) return NextResponse.json({ error: "API client has no organization scope" }, { status: 403 });
  const assessments = await prisma.assessment.findMany({
    where: { status: { in: ["SCHEDULED", "OPEN", "CLOSED"] }, course: { assignments: { some: { group: { organizationId: auth.organizationId } } } } },
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      passingScore: true,
      durationMinutes: true,
      status: true,
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: assessments,
    meta: {
      count: assessments.length,
      limit,
    },
  });
}
