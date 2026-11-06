import { createHash } from "crypto";
import type {
  StorageAdapter,
  UploadOptions,
  UploadResult,
  DownloadResult,
  StorageObjectMetadata,
  SignedUrlOptions,
  SignedUrlResult,
} from "./types";
import { validateObjectKey } from "./keys";

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

/**
 * S3-compatible adapter skeleton.
 * Uses fetch for minimal dependency; in production, replace with @aws-sdk/client-s3
 * if available. This implementation documents required env and validates config.
 * For Phase 30, it is NOT VERIFIED against a live bucket unless credentials exist.
 *
 * NOTE: No secret values are logged. Errors name missing keys only.
 */
export class S3StorageAdapter implements StorageAdapter {
  readonly provider = "s3" as const;
  private config: S3Config;

  constructor(config: S3Config) {
    this.validateConfig(config);
    this.config = config;
  }

  private validateConfig(c: S3Config): void {
    const missing: string[] = [];
    if (!c.bucket) missing.push("STORAGE_S3_BUCKET");
    if (!c.region) missing.push("STORAGE_S3_REGION");
    if (!c.accessKeyId) missing.push("STORAGE_S3_ACCESS_KEY_ID");
    if (!c.secretAccessKey) missing.push("STORAGE_S3_SECRET_ACCESS_KEY");
    if (missing.length) {
      throw new Error(`Invalid S3 storage configuration: missing ${missing.join(", ")}`);
    }
  }

  private sha256(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex");
  }

  // Placeholder: actual S3 calls require SDK or signed requests.
  // For audit purposes, we document that provider is configured but not verified
  // until integration tests run against staging bucket.

  async upload(options: UploadOptions): Promise<UploadResult> {
    validateObjectKey(options.key);
    // If SDK not installed, we cannot perform real upload; throw with safe message
    // The factory will only instantiate this when env says S3 and credentials exist.
    // Here we implement a minimal fetch-based PUT if endpoint is S3-compatible.
    // For safety, if endpoint missing, we report NOT IMPLEMENTED.
    if (!this.config.endpoint) {
      throw new Error("S3 upload not implemented without SDK and endpoint; configure @aws-sdk/client-s3 or S3-compatible endpoint");
    }
    const checksum = this.sha256(options.bytes);
    const url = `${this.config.endpoint.replace(/\/$/, "")}/${this.config.bucket}/${options.key}`;
    // NOTE: This is simplified and does not include AWS SigV4; real implementation needs SDK
    throw new Error(`S3 adapter requires AWS SDK for signed requests; attempted upload to ${this.config.bucket}/${options.key} aborted`);
  }

  async getMetadata(_key: string): Promise<StorageObjectMetadata | null> {
    throw new Error("S3 getMetadata requires SDK; not verified in this environment");
  }

  async download(_key: string): Promise<DownloadResult> {
    throw new Error("S3 download requires SDK; not verified in this environment");
  }

  async generateSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult | null> {
    validateObjectKey(options.key);
    if (options.expiresInSeconds <= 0 || options.expiresInSeconds > 3600) {
      throw new Error("Signed URL expiration must be between 1 and 3600 seconds");
    }
    // Real implementation would use @aws-sdk/s3-presigner
    throw new Error("S3 signed URL generation requires SDK; not verified");
  }

  async delete(_key: string): Promise<boolean> {
    throw new Error("S3 delete requires SDK; not verified");
  }

  async copy(_sourceKey: string, _destKey: string): Promise<UploadResult> {
    throw new Error("S3 copy requires SDK; not verified");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("S3 exists check requires SDK; not verified");
  }

  async verifyChecksum(_key: string, _expectedSha256: string): Promise<boolean> {
    throw new Error("S3 checksum verification requires download + SDK; not verified");
  }
}
