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

  if (!ApiKeyService.hasScope(auth, "users:read")) {
    return NextResponse.json({ error: "Forbidden: scope 'users:read' required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  if (!auth.organizationId) return NextResponse.json({ error: "API client has no organization scope" }, { status: 403 });
  const users = await prisma.user.findMany({
    where: { organizationId: auth.organizationId },
    take: limit,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      status: true,
    },
  });

  return NextResponse.json({
    data: users,
    meta: {
      count: users.length,
      limit,
    },
  });
}
