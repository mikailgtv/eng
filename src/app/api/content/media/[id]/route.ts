import { NextResponse } from "next/server";
import { apiRoute, requireApiUser } from "@/lib/api";
import { readContentMedia } from "@/lib/content/media";
import { logDownloadAuthFailure } from "@/lib/storage/monitoring";

function safeDispositionFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80).replace(/"/g, "");
  return cleaned || "file";
}

export const GET = apiRoute(async (_req, ctx: { params: { id: string } }) => {
  const user = await requireApiUser();
  try {
    const file = await readContentMedia(user, ctx.params.id);
    const safeName = safeDispositionFileName(file.fileName);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
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
