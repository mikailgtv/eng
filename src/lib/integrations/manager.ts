import { prisma } from "../prisma";
import {
  IIntegrationProvider,
  IEmailProvider,
  ISmsProvider,
  IPushProvider,
  ICalendarProvider,
  ILearningRecordProvider,
  HealthCheckResult,
} from "./types";
import { encryptSecret, decryptSecret, maskSecret } from "./crypto";
import { getCircuitBreaker } from "./circuit-breaker";
import { validateExternalUrl } from "./ssrf";

class IntegrationRegistry {
  private providers = new Map<string, IIntegrationProvider>();

  constructor() {
    // No vendor adapter is registered by default. Production providers must be
    // explicitly installed/configured; demo adapters are not reported as live.
  }

  public register(provider: IIntegrationProvider) {
    this.providers.set(provider.slug, provider);
  }

  public getProvider(slug: string): IIntegrationProvider | undefined {
    return this.providers.get(slug);
  }

  public getAllProviders(): IIntegrationProvider[] {
    return Array.from(this.providers.values());
  }
}

export const integrationRegistry = new IntegrationRegistry();

export class IntegrationManager {
  /**
   * Initializes default database connections if not already present.
   */
  public static async ensureDefaults(organizationId: string) {
    if (!organizationId) throw new Error("Integration registry requires an organization scope.");
    // Placeholder registry rows are explicitly DISCONNECTED. They do not claim
    // vendor connectivity until a real provider adapter and credentials exist.
    const defaults = [
      { slug: "enterprise-email", name: "Email Provider", category: "EMAIL", provider: "smtp", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
      { slug: "enterprise-sms", name: "SMS Provider (Optional)", category: "SMS", provider: "sms-adapter", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
      { slug: "enterprise-web-push", name: "Web Push Provider", category: "PUSH", provider: "web-push", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
      { slug: "enterprise-identity", name: "Identity / SSO Provider", category: "IDENTITY_SSO", provider: "oidc-or-saml-adapter", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
      { slug: "enterprise-calendar", name: "External Calendar Provider", category: "CALENDAR", provider: "calendar-adapter", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
      { slug: "enterprise-hr-directory", name: "HR / Employee Directory", category: "HR_DIRECTORY", provider: "hr-adapter", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
      { slug: "enterprise-learning-records", name: "External Learning Record Store", category: "LEARNING_RECORD", provider: "learning-record-adapter", status: "DISCONNECTED", endpointUrl: null, configJson: "{}" },
    ];

    for (const def of defaults) {
      const existing = await prisma.integrationConnection.findFirst({ where: { slug: def.slug, organizationId } });
      if (!existing) {
        await prisma.integrationConnection.create({ data: { ...def, organizationId } });
      } else if (["smtp-mock", "twilio-sms", "web-push-standard", "oidc", "enterprise-calendar", "xapi-lrs"].includes(existing.provider)) {
        // Replace former demo flags with an honest disconnected state.
        await prisma.integrationConnection.update({
          where: { id: existing.id },
          data: { status: "DISCONNECTED", enabled: false, endpointUrl: null, configJson: "{}", healthMessage: "No production provider adapter is configured." },
        });
      }
    }
  }

  /**
   * Retrieves all connections with masked credentials for safe admin UI consumption.
   */
  public static async listConnections(organizationId: string) {
    await this.ensureDefaults(organizationId);
    const connections = await prisma.integrationConnection.findMany({
      where: { organizationId },
      include: {
        credentials: true,
        _count: {
          select: { logs: true, jobs: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return connections.map((conn) => {
      let config: Record<string, unknown> = {};
      try {
        config = JSON.parse(conn.configJson || "{}");
      } catch {
        config = {};
      }
      const redactedConfig = Object.fromEntries(Object.entries(config).map(([key, value]) => {
        if (/secret|password|token|api.?key|authorization|credential/i.test(key)) return [key, "[REDACTED]"];
        return [key, value];
      }));

      return {
        id: conn.id,
        slug: conn.slug,
        name: conn.name,
        category: conn.category,
        provider: conn.provider,
        status: conn.status,
        endpointUrl: conn.endpointUrl,
        environment: conn.environment,
        enabled: conn.enabled,
        lastSyncAt: conn.lastSyncAt,
        lastHealthAt: conn.lastHealthAt,
        healthMessage: conn.healthMessage,
        healthLatencyMs: conn.healthLatencyMs,
        config: redactedConfig,
        stats: {
          logsCount: conn._count.logs,
          jobsCount: conn._count.jobs,
        },
        credentials: conn.credentials.map((c) => ({
          id: c.id,
          key: c.key,
          keyHint: maskSecret(decryptSecret(c.encryptedValue)),
          updatedAt: c.updatedAt,
        })),
      };
    });
  }

  /**
   * Sets or rotates an integration secret securely.
   */
  public static async setCredential(connectionId: string, key: string, plainSecret: string, organizationId: string) {
    const connection = await prisma.integrationConnection.findFirst({ where: { id: connectionId, organizationId }, select: { id: true } });
    if (!connection) throw new Error("Integration connection not found in this organization.");
    const encryptedValue = encryptSecret(plainSecret);
    return await prisma.integrationCredential.upsert({
      where: {
        connectionId_key: { connectionId, key },
      },
      create: {
        connectionId,
        key,
        encryptedValue,
        rotatedAt: new Date(),
      },
      update: {
        encryptedValue,
        rotatedAt: new Date(),
      },
    });
  }

  /**
   * Tests connection with SSRF protection, circuit breaker, and audit logging.
   */
  public static async testConnection(connectionId: string, organizationId: string): Promise<HealthCheckResult> {
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: connectionId, organizationId },
      include: { credentials: true },
    });

    if (!connection) {
      throw new Error(`Integration connection ${connectionId} not found`);
    }

    // SSRF Check if endpoint URL is present
    if (connection.endpointUrl) {
      const ssrf = validateExternalUrl(connection.endpointUrl);
      if (!ssrf.isValid) {
        const errorResult: HealthCheckResult = {
          ok: false,
          latencyMs: 0,
          message: `SSRF Validation Blocked: ${ssrf.reason}`,
          timestamp: new Date().toISOString(),
        };

        await prisma.integrationConnection.update({
          where: { id: connectionId },
          data: {
            status: "ERROR",
            lastHealthAt: new Date(),
            healthMessage: errorResult.message,
            healthLatencyMs: 0,
          },
        });

        await prisma.integrationLog.create({
          data: {
            connectionId,
            level: "ERROR",
            action: "TEST_CONNECTION",
            status: "BLOCKED_SSRF",
            endpoint: connection.endpointUrl,
            message: errorResult.message,
          },
        });

        return errorResult;
      }
    }

    const provider = integrationRegistry.getProvider(connection.provider);
    if (!provider) {
      const result: HealthCheckResult = {
        ok: false,
        latencyMs: 0,
        message: `No production provider adapter is registered for '${connection.provider}'. Connection was not attempted.`,
        timestamp: new Date().toISOString(),
      };
      await this.recordHealth(connection.id, result);
      await prisma.integrationLog.create({
        data: { connectionId, level: "WARN", action: "TEST_CONNECTION", status: "FAILURE", endpoint: connection.endpointUrl, message: result.message },
      });
      return result;
    }

    const breaker = getCircuitBreaker(connection.slug, {
      failureThreshold: connection.retryLimit || 3,
      timeoutMs: connection.timeoutMs || 8000,
    });

    try {
      const creds: Record<string, string> = {};
      for (const c of connection.credentials) {
        creds[c.key] = decryptSecret(c.encryptedValue);
      }

      let config = {};
      try {
        config = JSON.parse(connection.configJson || "{}");
      } catch {
        config = {};
      }

      const checkResult = await breaker.execute(() => provider.testConnection(config, creds));
      await this.recordHealth(connection.id, checkResult);

      await prisma.integrationLog.create({
        data: {
          connectionId,
          level: "INFO",
          action: "TEST_CONNECTION",
          status: "SUCCESS",
          durationMs: checkResult.latencyMs,
          endpoint: connection.endpointUrl,
          message: checkResult.message,
        },
      });

      return checkResult;
    } catch (err: any) {
      const failResult: HealthCheckResult = {
        ok: false,
        latencyMs: 0,
        message: err.message || "Failed to reach external integration endpoint",
        timestamp: new Date().toISOString(),
      };
      await this.recordHealth(connection.id, failResult);

      await prisma.integrationLog.create({
        data: {
          connectionId,
          level: "ERROR",
          action: "TEST_CONNECTION",
          status: "FAILURE",
          endpoint: connection.endpointUrl,
          message: failResult.message,
        },
      });

      return failResult;
    }
  }

  private static async recordHealth(connectionId: string, result: HealthCheckResult) {
    await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        status: result.ok ? "ACTIVE" : "ERROR",
        lastHealthAt: new Date(),
        healthMessage: result.message,
        healthLatencyMs: result.latencyMs,
      },
    });
  }
}
