import { NextResponse } from "next/server";
import { ApiError, apiRoute, requireApiUser } from "@/lib/api";
import { REPORT_KINDS, buildReport, type ReportKind } from "@/lib/certificates/reports";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "";
  const format = url.searchParams.get("format") ?? "csv";
  if (!REPORT_KINDS.includes(kind as ReportKind)) throw new ApiError(400, "Choose a report type.");
  if (format !== "csv" && format !== "xlsx" && format !== "pdf") throw new ApiError(400, "Choose CSV, XLSX, or PDF.");
  const report = await buildReport(user, kind as ReportKind, format, url.searchParams.get("groupId") ?? undefined, url.searchParams.get("courseId") ?? undefined);
  return new NextResponse(new Uint8Array(report.body), {
    headers: {
      "Content-Type": report.contentType,
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
