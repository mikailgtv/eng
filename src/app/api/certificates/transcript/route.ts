import { NextResponse } from "next/server";
import { ApiError, apiRoute, requireApiUser } from "@/lib/api";
import { transcriptPdf } from "@/lib/certificates/reports";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser();
  const studentId = user.role === "STUDENT" ? user.id : new URL(req.url).searchParams.get("studentId");
  if (!studentId) throw new ApiError(400, "Choose a student.");
  const pdf = await transcriptPdf(user, studentId);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"training-record.pdf\"",
      "Cache-Control": "private, no-store",
    },
  });
});
