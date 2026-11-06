import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { DataExchangeEngine } from "@/lib/integrations/data-exchange";

export async function GET(req: Request) {
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const csv = await DataExchangeEngine.exportTrainingRecordsCsv(organizationId!);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="training_records_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
