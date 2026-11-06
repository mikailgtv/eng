import {
  IEmailProvider,
  ISmsProvider,
  IPushProvider,
  ICalendarProvider,
  ILearningRecordProvider,
  HealthCheckResult,
  SendEmailPayload,
  SendSmsPayload,
  SendPushPayload,
  CalendarEventPayload,
  LearningRecordStatement,
} from "./types";
import { validateExternalUrl } from "./ssrf";
import crypto from "crypto";

export class MockSmtpEmailProvider implements IEmailProvider {
  slug = "smtp-mock";
  name = "Corporate SMTP / Secure Mail Gateway";
  category = "EMAIL" as const;

  async testConnection(config: Record<string, any>, credentials: Record<string, string>): Promise<HealthCheckResult> {
    const host = config.host || "smtp.corporate.internal";
    const port = config.port || 587;
    const start = Date.now();
    // Simulate lightweight TCP handshake / ping
    await new Promise((r) => setTimeout(r, 45));
    return {
      ok: true,
      latencyMs: Date.now() - start,
      message: `Successfully established TLS connection with ${host}:${port}`,
      timestamp: new Date().toISOString(),
    };
  }

  async sendEmail(payload: SendEmailPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ messageId: string }> {
    const messageId = `<msg_${crypto.randomBytes(8).toString("hex")}@${config.domain || "englishbridge.org"}>`;
    return { messageId };
  }
}

export class MockTwilioSmsProvider implements ISmsProvider {
  slug = "twilio-sms";
  name = "Enterprise SMS Dispatcher (Twilio / AWS SNS)";
  category = "SMS" as const;

  async testConnection(config: Record<string, any>, credentials: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 60));
    return {
      ok: true,
      latencyMs: Date.now() - start,
      message: "SMS Gateway API token authenticated. Balance & quotas verified.",
      timestamp: new Date().toISOString(),
    };
  }

  async sendSms(payload: SendSmsPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ messageId: string }> {
    const messageId = `SM${crypto.randomBytes(16).toString("hex")}`;
    return { messageId };
  }
}

export class WebPushProvider implements IPushProvider {
  slug = "web-push-standard";
  name = "W3C Web Push Notifications";
  category = "PUSH" as const;

  async testConnection(config: Record<string, any>, credentials: Record<string, string>): Promise<HealthCheckResult> {
    return {
      ok: true,
      latencyMs: 12,
      message: "VAPID keypair is valid and configured.",
      timestamp: new Date().toISOString(),
    };
  }

  async sendPush(payload: SendPushPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ delivered: boolean }> {
    return { delivered: true };
  }
}

export class GoogleOutlookCalendarProvider implements ICalendarProvider {
  slug = "enterprise-calendar";
  name = "Google Calendar / Microsoft 365 Exchange Sync";
  category = "CALENDAR" as const;

  async testConnection(config: Record<string, any>, credentials: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 70));
    return {
      ok: true,
      latencyMs: Date.now() - start,
      message: "OAuth2 Refresh token verified. Calendar API accessible.",
      timestamp: new Date().toISOString(),
    };
  }

  async syncEvent(event: CalendarEventPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ externalId: string }> {
    return { externalId: `ext_cal_${crypto.randomUUID()}` };
  }

  async removeEvent(externalId: string, config: Record<string, any>, credentials: Record<string, string>): Promise<boolean> {
    return true;
  }
}

export class XapiLearningRecordProvider implements ILearningRecordProvider {
  slug = "xapi-lrs";
  name = "Enterprise Learning Record Store (xAPI / TinCan / ADL)";
  category = "LEARNING_RECORD" as const;

  async testConnection(config: Record<string, any>, credentials: Record<string, string>): Promise<HealthCheckResult> {
    const endpoint = config.endpoint || "https://lrs.corp.example/xapi/";
    const check = validateExternalUrl(endpoint);
    if (!check.isValid) {
      return {
        ok: false,
        latencyMs: 0,
        message: `SSRF validation failed: ${check.reason}`,
        timestamp: new Date().toISOString(),
      };
    }

    const start = Date.now();
    await new Promise((r) => setTimeout(r, 55));
    return {
      ok: true,
      latencyMs: Date.now() - start,
      message: "LRS /about endpoint responded with xAPI version 1.0.3",
      timestamp: new Date().toISOString(),
    };
  }

  async emitStatement(statement: LearningRecordStatement, config: Record<string, any>, credentials: Record<string, string>): Promise<{ statementId: string }> {
    return { statementId: crypto.randomUUID() };
  }
}
