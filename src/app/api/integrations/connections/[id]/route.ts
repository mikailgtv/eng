import { NextResponse } from "next/server";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { validateExternalUrl } from "@/lib/integrations/ssrf";
import { integrationRegistry } from "@/lib/integrations/manager";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const current = await prisma.integrationConnection.findFirst({ where: { id: id, organizationId: organizationId! } });
    if (!current) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    const body = await req.json();
    const data: Record<string, any> = {};
    if (typeof body.name === "string") data.name = body.name.slice(0, 120);
    if (body.config !== undefined) {
      if (!body.config || typeof body.config !== "object" || Array.isArray(body.config) || Object.keys(body.config).some((k) => /secret|password|token|api.?key|authorization|credential/i.test(k))) {
        return NextResponse.json({ error: "Invalid config. Store secrets separately through the credentials endpoint." }, { status: 400 });
      }
      data.configJson = JSON.stringify(body.config);
    }
    if (body.endpointUrl !== undefined) {
      if (body.endpointUrl === null || body.endpointUrl === "") data.endpointUrl = null;
      else {
        const check = validateExternalUrl(body.endpointUrl);
        if (!check.isValid) return NextResponse.json({ error: `Endpoint rejected: ${check.reason}` }, { status: 400 });
        data.endpointUrl = check.sanitizedUrl;
      }
    }
    if (body.enabled === true) {
      if (!integrationRegistry.getProvider(current.provider)) return NextResponse.json({ error: "Cannot enable: no production provider adapter is installed for this provider." }, { status: 409 });
      const secretCount = await prisma.integrationCredential.count({ where: { connectionId: current.id } });
      if (secretCount === 0 && ["EMAIL", "SMS", "PUSH", "IDENTITY_SSO", "HR_DIRECTORY"].includes(current.category)) {
        return NextResponse.json({ error: "Cannot enable: required encrypted credentials are missing." }, { status: 409 });
      }
      data.enabled = true;
    }
    if (body.enabled === false) { data.enabled = false; data.status = "DISABLED"; }
    const updated = await prisma.integrationConnection.update({ where: { id: current.id }, data, select: { id: true, name: true, category: true, provider: true, status: true, enabled: true, endpointUrl: true, updatedAt: true } });
    await audit({ actorId: user.id, action: "INTEGRATION_CONFIG_UPDATED", entityType: "INTEGRATION", entityId: current.id, metadata: { enabled: updated.enabled } });
    return NextResponse.json({ connection: updated });
  } catch {
    return NextResponse.json({ error: "Integration configuration update failed." }, { status: 400 });
  }
}
