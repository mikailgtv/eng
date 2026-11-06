import path from "path";
import { access as accessAsync, stat as statAsync } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import type { StorageAdapter, StorageProvider } from "./types";
import { LocalStorageAdapter } from "./local";
import { MemoryStorageAdapter } from "./memory";
import { S3StorageAdapter, type S3Config } from "./s3";

let cachedAdapter: StorageAdapter | null = null;
let cachedProvider: StorageProvider | null = null;

function env(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v === "") return undefined;
  return v;
}

export function getStorageProvider(): StorageProvider {
  const raw = (env("STORAGE_PROVIDER") || "local").toLowerCase() as StorageProvider;
  if (["local", "s3", "memory"].includes(raw)) return raw;
  if (process.env.NODE_ENV === "test") return "memory";
  return "local";
}

export function getStorageRoot(): string {
  // Environment separation: each env must use intended destination
  const explicit = env("STORAGE_LOCAL_ROOT");
  if (explicit) return explicit;
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "test") return path.join(process.cwd(), "storage-test");
  if (nodeEnv === "production") return path.join(process.cwd(), "storage");
  // Development and staging share structure but should be separate buckets/paths
  // Staging should set STORAGE_LOCAL_ROOT or STORAGE_PROVIDER=s3 to avoid prod overlap
  const staging = env("STORAGE_STAGING_ROOT") || env("STORAGE_LOCAL_ROOT");
  if (staging) return staging;
  return path.join(process.cwd(), "storage");
}

export function createStorageAdapter(provider?: StorageProvider): StorageAdapter {
  const p = provider || getStorageProvider();

  if (p === "memory") {
    return new MemoryStorageAdapter();
  }

  if (p === "local") {
    const root = getStorageRoot();
    return new LocalStorageAdapter(root);
  }

  if (p === "s3") {
    const cfg: S3Config = {
      bucket: env("STORAGE_S3_BUCKET") || "",
      region: env("STORAGE_S3_REGION") || "",
      endpoint: env("STORAGE_S3_ENDPOINT"),
      accessKeyId: env("STORAGE_S3_ACCESS_KEY_ID") || "",
      secretAccessKey: env("STORAGE_S3_SECRET_ACCESS_KEY") || "",
      forcePathStyle: env("STORAGE_S3_FORCE_PATH_STYLE") === "true",
    };
    return new S3StorageAdapter(cfg);
  }

  throw new Error(`Unsupported storage provider: ${p}`);
}

export function getStorageAdapter(): StorageAdapter {
  const provider = getStorageProvider();
  if (cachedAdapter && cachedProvider === provider) {
    return cachedAdapter;
  }
  cachedAdapter = createStorageAdapter(provider);
  cachedProvider = provider;
  return cachedAdapter;
}

export function resetStorageAdapterCache(): void {
  cachedAdapter = null;
  cachedProvider = null;
}

export function validateStorageEnv(): { provider: StorageProvider; root?: string; bucket?: string } {
  const provider = getStorageProvider();
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "production" && provider === "memory") {
    throw new Error("Invalid server environment configuration: STORAGE_PROVIDER (memory not allowed in production)");
  }
  if (nodeEnv === "production" && env("STORAGE_STAGING_ROOT")) {
    throw new Error("Invalid server environment configuration: STORAGE_STAGING_ROOT (not allowed in production)");
  }
  if (provider === "local") {
    const root = getStorageRoot();
    if (!root) throw new Error("Invalid server environment configuration: STORAGE_LOCAL_ROOT");
    if (root === "/" || root === "") throw new Error("Invalid server environment configuration: STORAGE_LOCAL_ROOT");
    if (root.includes("..")) throw new Error("Invalid server environment configuration: STORAGE_LOCAL_ROOT");
    return { provider, root };
  }
  if (provider === "s3") {
    // Phase 36 (PG-35-02): the S3 adapter is a stub — all eight operations
    // throw. Rejecting it here means no code path can treat S3 as usable,
    // regardless of how completely the S3_* variables are populated.
    throw new Error(
      "Invalid server environment configuration: STORAGE_PROVIDER (S3 storage is not implemented in this release; use local storage with a persistent volume)",
    );
  }
  if (provider === "memory") {
    return { provider };
  }
  throw new Error(`Invalid server environment configuration: STORAGE_PROVIDER`);
}

/**
 * Phase 36 (PG-35-04): the real, sanitized state of the configured storage
 * provider, used by the readiness endpoint. Deliberately reports no filesystem
 * path or bucket name.
 */
export type StorageReadinessState = "READY" | "UNSUPPORTED" | "MISCONFIGURED";
export type StorageReadiness = { provider: StorageProvider; state: StorageReadinessState; detail: string };

export async function getStorageReadiness(): Promise<StorageReadiness> {
  const provider = getStorageProvider();
  if (provider === "s3") {
    return { provider, state: "UNSUPPORTED", detail: "S3 storage is not implemented in this release." };
  }
  if (provider === "memory") {
    return {
      provider,
      state: "MISCONFIGURED",
      detail: "In-memory storage is not durable and is not supported outside tests.",
    };
  }
  try {
    const root = getStorageRoot();
    const stat = await statAsync(root);
    if (!stat.isDirectory()) {
      return { provider, state: "MISCONFIGURED", detail: "Local storage root is not a directory." };
    }
    await accessAsync(root, fsConstants.W_OK);
    return { provider, state: "READY", detail: "Local storage root is present and writable." };
  } catch {
    return { provider, state: "MISCONFIGURED", detail: "Local storage root is missing or not writable." };
  }
}

// Re-exports for convenience
export * from "./types";
export * from "./keys";
export * from "./policies";
export * from "./validation";
