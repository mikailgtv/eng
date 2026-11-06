import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { HrDirectorySyncEngine, SyncCandidateUser } from "@/lib/integrations/hr-sync";

export async function POST(req: Request) {
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.sync");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { providerSlug, users, conflictStrategy } = await req.json();

    if (!providerSlug || !Array.isArray(users)) {
      return NextResponse.json({ error: "providerSlug and users array required" }, { status: 400 });
    }

    const result = await HrDirectorySyncEngine.syncUsers(
      providerSlug,
      organizationId!,
      users as SyncCandidateUser[],
      { conflictStrategy: conflictStrategy || "EXTERNAL_WINS" }
    );

    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
