import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { DataExchangeEngine } from "@/lib/integrations/data-exchange";

export async function POST(req: Request) {
  const { user, allowed } = await authorizeIntegration("integrations.sync");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { action, batchId, filename, content, entityType, format, conflictStrategy } = await req.json();

    if (action === "commit") {
      if (!batchId) {
        return NextResponse.json({ error: "batchId required for commit" }, { status: 400 });
      }
      const committed = await DataExchangeEngine.commitImport(batchId, user.id);
      return NextResponse.json({ success: true, batch: committed });
    }

    // Default: validate / dry-run
    if (!content || !entityType || !format) {
      return NextResponse.json({ error: "content, entityType, and format are required" }, { status: 400 });
    }

    const validation = await DataExchangeEngine.validateImport(
      filename || "import.csv",
      content,
      entityType,
      format,
      user.id,
      conflictStrategy || "LMS_WINS"
    );

    return NextResponse.json({ validation });
  } catch (err) {
    return handleApiError(err);
  }
}
