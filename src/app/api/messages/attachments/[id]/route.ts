import { NextResponse } from "next/server";
import { apiRoute, requireApiUser } from "@/lib/api";
import { readAttachment } from "@/lib/communication/messages";
import { logDownloadAuthFailure } from "@/lib/storage/monitoring";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80).replace(/"/g, "") || "file";
}

export const GET = apiRoute(async (_req, ctx: { params: { id: string } }) => {
  const user = await requireApiUser();
  try {
    const file = await readAttachment(user, ctx.params.id);
    const cleaned = safeName(file.fileName);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${cleaned}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`,
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "X-Request-Id": crypto.randomUUID(),
      },
    });
  } catch (err) {
    if (err instanceof Error && /not found/i.test(err.message)) {
      logDownloadAuthFailure({ fileId: ctx.params.id, actorId: user.id });
    }
    throw err;
  }
});
