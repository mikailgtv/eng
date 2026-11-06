import { NextResponse } from "next/server";
import { ApiError, apiRoute, assertSameOrigin, parseJsonBody, requireApiUser } from "@/lib/api";
import { requestOrigin } from "@/lib/certificates/access";
import { previewCertificate } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { courseId?: string; studentId?: string };
  if (!body.courseId) throw new ApiError(400, "Choose a course.");
  const studentId = user.role === "STUDENT" ? user.id : body.studentId;
  if (!studentId) throw new ApiError(400, "Choose a student.");
  const preview = await previewCertificate(user, studentId, body.courseId, requestOrigin(req));
  return new NextResponse(new Uint8Array(preview.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"certificate-preview.pdf\"",
      "X-Certificate-Issued": "no",
      "X-Certificate-Id": "none",
      "Cache-Control": "private, no-store",
    },
  });
});
