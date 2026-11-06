import { NextResponse } from "next/server";
import crypto from "crypto";
import { WebhookService } from "@/lib/integrations/webhooks";
import { decryptSecret } from "@/lib/integrations/crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const signature = req.headers.get("x-eb-signature") || "";
  const timestamp = req.headers.get("x-eb-timestamp") || "";
  const deliveryId = req.headers.get("x-eb-delivery-id") || "";
  const organizationId = req.headers.get("x-eb-organization-id") || "";
  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (!signature || !timestamp || !deliveryId || !organizationId) {
    return NextResponse.json({ error: "Signature, timestamp, and delivery ID are required" }, { status: 401 });
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return NextResponse.json({ error: "Expired or invalid webhook timestamp" }, { status: 401 });
  }

  const conn = await prisma.integrationConnection.findFirst({
    where: { category: "WEBHOOK", enabled: true, organizationId },
    include: { credentials: true },
  });
  const encrypted = conn?.credentials.find((c) => c.key === "inboundSecret")?.encryptedValue;
  if (!encrypted) return NextResponse.json({ error: "Inbound webhook is not configured" }, { status: 503 });
  const secret = decryptSecret(encrypted);
  if (!secret || secret.startsWith("[DECRYPTION_ERROR")) return NextResponse.json({ error: "Inbound webhook credential unavailable" }, { status: 503 });

  const signedPayload = `${timestamp}.${rawBody}`;
  if (!WebhookService.verifyInboundSignature(signedPayload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof body.event !== "string" || !/^[a-z0-9_.-]{1,100}$/i.test(body.event)) {
    return NextResponse.json({ error: "Invalid webhook event schema" }, { status: 400 });
  }

  const duplicate = await prisma.webhookInboundReceipt.findFirst({ where: { organizationId, deliveryId } });
  if (duplicate) return NextResponse.json({ received: true, duplicate: true }, { status: 200 });

  try {
    await prisma.webhookInboundReceipt.create({
      data: { organizationId, deliveryId, event: body.event, payloadHash: crypto.createHash("sha256").update(rawBody).digest("hex") },
    });
  } catch {
    // Unique delivery ID makes this idempotent under concurrent retries.
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  await prisma.integrationLog.create({
    data: {
      connectionId: conn.id,
      level: "INFO",
      action: "SYNC_INBOUND",
      status: "SUCCESS",
      message: `Inbound webhook received: ${body.event}`,
      detailsJson: JSON.stringify({ event: body.event, deliveryId }),
    },
  });
  return NextResponse.json({ received: true, duplicate: false, timestamp: new Date().toISOString() });
}
