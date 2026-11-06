import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { ApiKeyService } from "@/lib/integrations/api-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET() {
  const { user, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const actorOrg = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
  const organizationId = actorOrg?.organizationId || actorOrg?.organizationLinks[0]?.organizationId;
  const clients = await prisma.apiClientCredential.findMany({
    where: { organizationId: organizationId || "__no_organization__" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      clientId: true,
      keyHint: true,
      scopes: true,
      rateLimitPerMin: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    clients: clients.map((c) => ({
      ...c,
      scopes: c.scopes.split(",").map((s) => s.trim()),
    })),
  });
}

export async function POST(req: Request) {
  const { user, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, scopes, rateLimitPerMin, expiresInDays } = await req.json();

    if (!name || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json({ error: "Name and scopes array are required" }, { status: 400 });
    }

    const allowedScopes = new Set(["users:read", "users:write", "courses:read", "courses:write", "attendance:read", "attendance:write", "assessments:read", "certificates:read", "reports:read", "learning_records:read"]);
    if (scopes.some((scope: unknown) => typeof scope !== "string" || !allowedScopes.has(scope))) {
      return NextResponse.json({ error: "One or more API scopes are unsupported" }, { status: 400 });
    }
    const created = await ApiKeyService.createCredential({ name, scopes, rateLimitPerMin, createdById: user.id, expiresInDays });
    await audit({ actorId: user.id, action: "INTEGRATION_API_KEY_CREATED", entityType: "INTEGRATION", entityId: created.clientId, metadata: { scopes: created.scopes } });
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
