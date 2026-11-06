/**
 * Optional channel providers. In-app is the primary channel.
 * A provider that only accepts a message is recorded as submitted, not delivered.
 */

export type ChannelResult = {
  status: "submitted" | "failed";
  detail: string;
  providerRef?: string;
};

export interface EmailProvider {
  name: string;
  configured: boolean;
  send(input: { to: string; subject: string; text: string }): Promise<ChannelResult>;
}

export interface SmsProvider {
  name: string;
  configured: boolean;
  send(input: { to: string; text: string }): Promise<ChannelResult>;
}

export interface PushProvider {
  name: string;
  configured: boolean;
  send(input: { endpoint: string; title: string; body: string }): Promise<ChannelResult>;
}

const unconfiguredEmail: EmailProvider = {
  name: "none",
  configured: false,
  async send() {
    return { status: "failed", detail: "Email provider is not configured. The in-app notice was kept." };
  },
};

const logEmail: EmailProvider = {
  name: "log",
  configured: true,
  async send() {
    return { status: "submitted", detail: "Accepted by the log provider. Delivery to an inbox was not confirmed." };
  },
};

const webhookEmail: EmailProvider = {
  name: "webhook",
  configured: true,
  async send(input) {
    const url = process.env.EMAIL_WEBHOOK_URL;
    if (!url) return unconfiguredEmail.send(input);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: input.to, subject: input.subject, text: input.text }),
      });
      if (!response.ok) return { status: "failed", detail: `Email provider returned ${response.status}.` };
      return { status: "submitted", detail: "The email provider accepted the message. Inbox delivery was not confirmed." };
    } catch {
      return { status: "failed", detail: "The email provider could not be reached." };
    }
  },
};

export function emailProvider(): EmailProvider {
  const name = process.env.EMAIL_PROVIDER || "none";
  if (name === "log") return logEmail;
  if (name === "webhook" && process.env.EMAIL_WEBHOOK_URL) return webhookEmail;
  return unconfiguredEmail;
}

const unconfiguredSms: SmsProvider = {
  name: "none",
  configured: false,
  async send() {
    return { status: "failed", detail: "SMS provider is not configured. No SMS was sent." };
  },
};

export function smsProvider(): SmsProvider {
  if (process.env.SMS_PROVIDER === "webhook" && process.env.SMS_WEBHOOK_URL) {
    return {
      name: "webhook",
      configured: true,
      async send(input) {
        try {
          const response = await fetch(process.env.SMS_WEBHOOK_URL as string, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: input.to, text: input.text }),
          });
          if (!response.ok) return { status: "failed", detail: `SMS provider returned ${response.status}.` };
          return { status: "submitted", detail: "The SMS provider accepted the message. Handset delivery was not confirmed." };
        } catch {
          return { status: "failed", detail: "The SMS provider could not be reached." };
        }
      },
    };
  }
  return unconfiguredSms;
}

export function pushProvider(): PushProvider {
  const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  return {
    name: configured ? "vapid" : "none",
    configured,
    async send() {
      if (!configured) return { status: "failed", detail: "Push provider is not configured. The in-app notice was kept." };
      return { status: "failed", detail: "Browser push delivery is not connected in this deployment. The in-app notice was kept." };
    },
  };
}

export function channelStatus() {
  return {
    inApp: { configured: true, detail: "In-app notices are the primary channel." },
    email: { configured: emailProvider().configured, detail: emailProvider().configured ? "Email can be submitted. Inbox delivery is not confirmed by this app." : "Email provider is not configured." },
    push: { configured: pushProvider().configured, detail: pushProvider().configured ? "A push key is set. This deployment still keeps the in-app notice." : "Push provider is not configured." },
    sms: { configured: smsProvider().configured, detail: smsProvider().configured ? "SMS can be submitted for urgent notices only." : "SMS is not connected. Routine SMS is not sent." },
  };
}
