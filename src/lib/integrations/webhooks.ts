import { logSafeError } from "@/lib/logging";
import crypto from "crypto";
import { prisma } from "../prisma";
import { validateExternalUrl } from "./ssrf";
import { getCircuitBreaker } from "./circuit-breaker";
import { decryptSecret } from "./crypto";

export interface OutboundWebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

export class WebhookService {
  /**
   * Dispatches an event to all subscribed active webhooks asynchronously.
   * Signs payloads with HMAC-SHA256 and records delivery telemetry.
   */
  public static async dispatch(organizationId: string, event: string, data: Record<string, any>): Promise<number> {
    if (!organizationId) throw new Error("Webhook dispatch requires organization scope.");
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { organizationId, isActive: true },
    });

    const matching = subscriptions.filter((sub) => {
      const events = sub.events.split(",").map((e) => e.trim());
      return events.includes(event) || events.includes("*");
    });

    if (matching.length === 0) return 0;

    const payload: OutboundWebhookPayload = {
      id: `evt_${crypto.randomUUID()}`,
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Dispatch non-blocking
    for (const sub of matching) {
      this.deliverWebhook(sub, payloadString, event).catch((err) => {
        logSafeError("webhook.delivery-failed", err);
      });
    }

    return matching.length;
  }

  private static async deliverWebhook(subscription: any, payloadString: string, event: string) {
    const ssrf = validateExternalUrl(subscription.targetUrl, { allowHttpInDev: false });
    if (!ssrf.isValid) {
      await prisma.webhookDelivery.create({ data: { subscriptionId: subscription.id, event, payloadJson: payloadString, status: "ABORTED", error: `Blocked by SSRF protection: ${ssrf.reason}` } });
      return;
    }

    const signingSecret = decryptSecret(subscription.secretKey);
    if (!signingSecret || signingSecret.startsWith("[DECRYPTION_ERROR")) {
      await prisma.webhookDelivery.create({ data: { subscriptionId: subscription.id, event, payloadJson: payloadString, status: "ABORTED", error: "Signing credential unavailable; delivery was not attempted." } });
      return;
    }
    const breaker = getCircuitBreaker(`webhook_${subscription.id}`, { failureThreshold: 5, timeoutMs: 5000 });
    const deliveryId = (() => { try { return JSON.parse(payloadString).id as string; } catch { return crypto.randomUUID(); } })();
    const maxAttempts = Math.min(Math.max(1, Number(subscription.retryLimit || 3)), 5);
    let succeeded = false;
    let lastStatus = 0;
    let lastError = "Delivery failed";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto.createHmac("sha256", signingSecret).update(`${timestamp}.${payloadString}`).digest("hex");
      const startedAt = Date.now();
      try {
        const response = await breaker.execute(async () => {
          const res = await fetch(ssrf.sanitizedUrl!, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-EB-Signature": `sha256=${signature}`,
              "X-EB-Timestamp": timestamp,
              "X-EB-Delivery-Id": deliveryId,
              "X-EB-Organization-Id": subscription.organizationId || "",
              "X-EB-Event": event,
              "User-Agent": "EnglishBridge-Webhook-Dispatcher/1.0",
            },
            body: payloadString,
            redirect: "manual",
          });
          if (res.status >= 300 && res.status < 400) throw new Error("Webhook redirects are not followed for SSRF protection.");
          if (!res.ok) {
            const error: any = new Error(`HTTP ${res.status}`);
            error.status = res.status;
            throw error;
          }
          return { status: res.status };
        });
        lastStatus = response.status;
        await prisma.webhookDelivery.create({ data: { subscriptionId: subscription.id, event, payloadJson: payloadString, statusCode: response.status, durationMs: Date.now() - startedAt, status: "DELIVERED", attemptNumber: attempt } });
        succeeded = true;
        break;
      } catch (err: any) {
        lastError = String(err?.message || "External delivery failed").slice(0, 300);
        lastStatus = Number(err?.status || 0);
        const transient = !lastStatus || lastStatus === 408 || lastStatus === 429 || lastStatus >= 500;
        const willRetry = attempt < maxAttempts && transient;
        await prisma.webhookDelivery.create({ data: { subscriptionId: subscription.id, event, payloadJson: payloadString, statusCode: lastStatus || null, durationMs: Date.now() - startedAt, status: willRetry ? "RETRYING" : "FAILED", attemptNumber: attempt, error: lastError } });
        if (!willRetry) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * (2 ** (attempt - 1)), 8000)));
      }
    }

    const current = await prisma.webhookSubscription.findUnique({ where: { id: subscription.id }, select: { failureCount: true } });
    const failures = succeeded ? 0 : (current?.failureCount || 0) + 1;
    await prisma.webhookSubscription.update({
      where: { id: subscription.id },
      data: { lastDeliveryAt: new Date(), lastStatusCode: succeeded ? lastStatus : (lastStatus || 500), failureCount: failures, ...(failures >= 10 ? { isActive: false } : {}) },
    });
  }

  /**
   * Verifies an inbound webhook HMAC signature
   */
  public static verifyInboundSignature(
    payloadRaw: string,
    signatureHeader: string,
    secret: string
  ): boolean {
    if (!signatureHeader || !secret) return false;
    const computed = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(payloadRaw)
      .digest("hex")}`;
    
    const bufA = Buffer.from(signatureHeader);
    const bufB = Buffer.from(computed);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
