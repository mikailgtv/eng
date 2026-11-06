import { handleApiError } from "@/lib/api";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { CalendarSyncService } from "@/lib/integrations/calendar-sync";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ics = await CalendarSyncService.generateUserIcs(user.id);
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="englishbridge_schedule_${user.id}.ics"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
