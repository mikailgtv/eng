import { handleApiError } from "@/lib/api";
import { authorizeIntegration } from "@/lib/integrations/authz";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExternalUrl } from "@/lib/integrations/ssrf";
import crypto from "crypto";
import { encryptSecret } from "@/lib/integrations/crypto";
import { audit } from "@/lib/audit";

export async function GET() {
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const subscriptions = await prisma.webhookSubscription.findMany({
    where: { organizationId: organizationId! },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, event: true, statusCode: true, durationMs: true, status: true, attemptNumber: true, error: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      targetUrl: s.targetUrl,
      events: s.events.split(",").map((e) => e.trim()),
      isActive: s.isActive,
      failureCount: s.failureCount,
      lastDeliveryAt: s.lastDeliveryAt,
      lastStatusCode: s.lastStatusCode,
      recentDeliveries: s.deliveries,
    })),
  });
}

export async function POST(req: Request) {
  const { user, organizationId, allowed } = await authorizeIntegration("integrations.manage");
  if (!user || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, targetUrl, events } = await req.json();

    if (!name || !targetUrl || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // SSRF Check
    const allowedEvents = new Set(["user.created", "user.updated", "user.deactivated", "enrollment.created", "lesson.completed", "assignment.submitted", "exam.completed", "certificate.issued", "certificate.revoked", "attendance.recorded", "course.completed"]);
    if (events.length === 0 || events.some((event: unknown) => typeof event !== "string" || !allowedEvents.has(event))) {
      return NextResponse.json({ error: "One or more webhook event types are unsupported" }, { status: 400 });
    }
    const ssrf = validateExternalUrl(targetUrl, { allowHttpInDev: false });
    if (!ssrf.isValid) {
      return NextResponse.json({ error: `SSRF Block: ${ssrf.reason}` }, { status: 400 });
    }

    const secretKey = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const subscription = await prisma.webhookSubscription.create({
      data: {
        organizationId: organizationId!,
        name,
        targetUrl: ssrf.sanitizedUrl!,
        secretKey: encryptSecret(secretKey),
        events: events.join(","),
        createdById: user.id,
      },
    });

    await audit({ actorId: user.id, action: "INTEGRATION_WEBHOOK_CREATED", entityType: "INTEGRATION", entityId: subscription.id, metadata: { events: subscription.events.split(",") } });
    return NextResponse.json({
      subscription: {
        id: subscription.id,
        name: subscription.name,
        targetUrl: subscription.targetUrl,
        events: subscription.events.split(","),
        secretKey, // Returned once on creation; at-rest value is encrypted.
      },
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
