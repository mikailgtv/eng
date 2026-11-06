import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { IntegrationManager } from "@/lib/integrations/manager";
import { prisma } from "@/lib/prisma";
import { validateExternalUrl } from "@/lib/integrations/ssrf";
import { audit } from "@/lib/audit";

export async function GET() {
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.view");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const connections = await IntegrationManager.listConnections(organizationId!);
  return NextResponse.json({ connections });
}

export async function POST(req: Request) {
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { slug, name, category, provider, endpointUrl, config } = body;
    const categories = ["EMAIL", "SMS", "PUSH", "CALENDAR", "IDENTITY_SSO", "HR_DIRECTORY", "LEARNING_RECORD", "WEBHOOK", "STORAGE", "REST_API"];
    if (!slug || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug) || !name || !categories.includes(category) || !provider) {
      return NextResponse.json({ error: "Missing or invalid integration fields" }, { status: 400 });
    }
    if (config && Object.keys(config).some((key) => /secret|password|token|api.?key|authorization|credential/i.test(key))) {
      return NextResponse.json({ error: "Secrets must be stored through the encrypted credentials endpoint, not config." }, { status: 400 });
    }
    let safeEndpoint: string | null = null;
    if (endpointUrl) {
      const checked = validateExternalUrl(endpointUrl);
      if (!checked.isValid) return NextResponse.json({ error: `Endpoint rejected: ${checked.reason}` }, { status: 400 });
      safeEndpoint = checked.sanitizedUrl || null;
    }
    const created = await prisma.integrationConnection.create({
      data: { slug, name, organizationId: organizationId!, category, provider, endpointUrl: safeEndpoint, enabled: false, status: "DISCONNECTED", configJson: config ? JSON.stringify(config) : "{}" },
      select: { id: true, slug: true, name: true, category: true, provider: true, status: true, endpointUrl: true, enabled: true },
    });
    await audit({ actorId: user.id, action: "INTEGRATION_CREATED", entityType: "INTEGRATION", entityId: created.id, metadata: { category, provider } });
    return NextResponse.json({ connection: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
