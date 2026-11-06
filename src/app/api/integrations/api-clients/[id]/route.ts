import { NextResponse } from "next/server";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { ApiKeyService } from "@/lib/integrations/api-auth";
import { audit } from "@/lib/audit";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const result = await ApiKeyService.rotateCredential(id, user.id);
    await audit({ actorId: user.id, action: "INTEGRATION_API_KEY_ROTATED", entityType: "INTEGRATION", entityId: id });
    return NextResponse.json({ client: result });
  } catch {
    return NextResponse.json({ error: "Credential not found or rotation failed" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const result = await ApiKeyService.revokeCredential(id, user.id);
    await audit({ actorId: user.id, action: "INTEGRATION_API_KEY_REVOKED", entityType: "INTEGRATION", entityId: id });
    return NextResponse.json({ client: result });
  } catch {
    return NextResponse.json({ error: "Credential not found or revocation failed" }, { status: 404 });
  }
}
