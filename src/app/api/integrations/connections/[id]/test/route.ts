import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { IntegrationManager } from "@/lib/integrations/manager";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await IntegrationManager.testConnection(id, organizationId!);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
