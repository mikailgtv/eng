import { prisma } from "../prisma";
import crypto from "crypto";
import { hashClientSecret, verifyClientSecret } from "./crypto";

export interface ApiAuthResult {
  isAuthenticated: boolean;
  clientId?: string;
  organizationId?: string | null;
  scopes: string[];
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  error?: string;
}

type ApiWindow = { count: number; resetAt: number };
const limiterGlobal = globalThis as unknown as { __integrationApiWindows?: Map<string, ApiWindow> };
const apiWindows = limiterGlobal.__integrationApiWindows ?? new Map<string, ApiWindow>();
limiterGlobal.__integrationApiWindows = apiWindows;

export class ApiKeyService {
  /**
   * Creates a new enterprise API client credential.
   * Returns plain clientSecret ONCE.
   */
  public static async createCredential(params: {
    name: string;
    scopes: string[];
    rateLimitPerMin?: number;
    createdById: string;
    expiresInDays?: number;
  }): Promise<{ clientId: string; clientSecret: string; keyHint: string; scopes: string[] }> {
    const creator = await prisma.user.findUnique({ where: { id: params.createdById }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
    const organizationId = creator?.organizationId || creator?.organizationLinks[0]?.organizationId;
    if (!organizationId) throw new Error("API clients require an organization-scoped administrator account.");
    const rawSecret = `eb_live_${crypto.randomBytes(24).toString("hex")}`;
    const clientId = `eb_client_${crypto.randomBytes(8).toString("hex")}`;
    const keyHint = `eb_live_••••${rawSecret.slice(-4)}`;
    const clientSecretHash = hashClientSecret(rawSecret);

    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 86400000)
      : null;

    await prisma.apiClientCredential.create({
      data: {
        name: params.name,
        clientId,
        organizationId,
        clientSecretHash,
        keyHint,
        scopes: params.scopes.join(","),
        rateLimitPerMin: params.rateLimitPerMin || 60,
        expiresAt,
        createdById: params.createdById,
      },
    });

    return {
      clientId,
      clientSecret: rawSecret,
      keyHint,
      scopes: params.scopes,
    };
  }

  public static async rotateCredential(id: string, actorId: string) {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
    const organizationId = actor?.organizationId || actor?.organizationLinks[0]?.organizationId;
    const owned = await prisma.apiClientCredential.findFirst({ where: { id, organizationId } });
    if (!owned) throw new Error("Credential not found");
    const rawSecret = `eb_live_${crypto.randomBytes(32).toString("hex")}`;
    const client = await prisma.apiClientCredential.update({
      where: { id },
      data: { clientSecretHash: hashClientSecret(rawSecret), keyHint: `eb_live_••••${rawSecret.slice(-4)}`, isActive: true },
      select: { clientId: true, keyHint: true },
    });
    return { ...client, clientSecret: rawSecret };
  }

  public static async revokeCredential(id: string, actorId: string) {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
    const organizationId = actor?.organizationId || actor?.organizationLinks[0]?.organizationId;
    const owned = await prisma.apiClientCredential.findFirst({ where: { id, organizationId } });
    if (!owned) throw new Error("Credential not found");
    return prisma.apiClientCredential.update({ where: { id }, data: { isActive: false }, select: { id: true, isActive: true } });
  }

  /**
   * Authenticates an incoming API request via HTTP headers.
   * Supports 'Authorization: Bearer <clientSecret>' or 'X-Client-Id' + 'X-Client-Secret'.
   */
  public static async authenticateRequest(headers: Headers): Promise<ApiAuthResult> {
    const authHeader = headers.get("authorization");
    const clientIdHeader = headers.get("x-client-id");
    const clientSecretHeader = headers.get("x-client-secret");

    let clientSecret = clientSecretHeader;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      // If bearer token starts with client secret prefix or client credential
      clientSecret = token;
    }

    if (!clientSecret) {
      return {
        isAuthenticated: false,
        scopes: [],
        error: "Missing API credentials in Authorization Bearer or X-Client-Secret header",
      };
    }

    // Lookup client either by ID or match by secret hash
    const targetHash = hashClientSecret(clientSecret);
    const client = await prisma.apiClientCredential.findFirst({
      where: {
        clientSecretHash: targetHash,
        isActive: true,
      },
    });

    if (!client || (clientIdHeader && client.clientId !== clientIdHeader)) {
      return {
        isAuthenticated: false,
        scopes: [],
        error: "Invalid or inactive API credentials",
      };
    }

    if (client.expiresAt && client.expiresAt < new Date()) {
      return {
        isAuthenticated: false,
        scopes: [],
        error: "API client credential has expired",
      };
    }

    const now = Date.now();
    const window = apiWindows.get(client.id);
    if (!window || window.resetAt <= now) {
      apiWindows.set(client.id, { count: 1, resetAt: now + 60_000 });
    } else if (window.count >= client.rateLimitPerMin) {
      return {
        isAuthenticated: true,
        clientId: client.clientId,
        organizationId: client.organizationId,
        scopes: client.scopes.split(",").map((s) => s.trim()),
        rateLimited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
      };
    } else {
      window.count++;
    }

    // Touch lastUsedAt asynchronously
    prisma.apiClientCredential.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      isAuthenticated: true,
      clientId: client.clientId,
      organizationId: client.organizationId,
      scopes: client.scopes.split(",").map((s) => s.trim()),
    };
  }

  /**
   * Enforces required scope for an authenticated request.
   */
  public static hasScope(auth: ApiAuthResult, requiredScope: string): boolean {
    if (!auth.isAuthenticated) return false;
    if (auth.scopes.includes("*") || auth.scopes.includes("admin")) return true;
    return auth.scopes.includes(requiredScope);
  }
}
