import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { pushProvider } from "@/lib/communication/providers";

export const GET = apiRoute(async () => {
  await requireApiUser();
  return jsonOk({
    available: pushProvider().configured,
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    detail: pushProvider().configured ? "Push registration can be stored. Delivery still keeps the in-app notice." : "Push provider is not configured.",
  });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { endpoint?: string; keyP256dh?: string; auth?: string };
  if (!body.endpoint || !body.endpoint.startsWith("https://")) throw new ApiError(400, "Enter a push endpoint.");
  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: user.id, endpoint: body.endpoint } },
    create: { userId: user.id, endpoint: body.endpoint, keyP256dh: body.keyP256dh ?? null, auth: body.auth ?? null },
    update: { revokedAt: null, keyP256dh: body.keyP256dh ?? null, auth: body.auth ?? null },
  });
  return jsonOk({ stored: true, delivered: false, detail: "The device was stored. This does not mean a push was delivered." });
});
