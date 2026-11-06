/**
 * Phase 30 — Storage abstraction types
 * Provides a consistent interface for local, S3, and memory adapters.
 * No secrets are logged or exposed.
 */

export type StorageProvider = "local" | "s3" | "memory";

export type AccessClassification = "PUBLIC" | "PRIVATE" | "RESTRICTED";

export type ProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface StorageObjectMetadata {
  key: string;
  sizeBytes: number;
  mimeType: string;
  checksumSha256?: string | null;
  lastModified?: Date;
  provider: StorageProvider;
  bucket?: string | null;
  accessLevel: AccessClassification;
  originalName?: string | null;
}

export interface UploadOptions {
  key: string;
  bytes: Buffer;
  mimeType: string;
  accessLevel: AccessClassification;
  originalName?: string;
  checksumSha256?: string;
  contentDisposition?: string;
}

export interface UploadResult {
  key: string;
  sizeBytes: number;
  checksumSha256: string;
  provider: StorageProvider;
  bucket?: string | null;
  etag?: string | null;
}

export interface DownloadResult {
  bytes: Buffer;
  metadata: StorageObjectMetadata;
}

export interface SignedUrlOptions {
  key: string;
  expiresInSeconds: number;
  operation: "GET" | "PUT";
  contentType?: string;
  disposition?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface StorageAdapter {
  readonly provider: StorageProvider;
  upload(options: UploadOptions): Promise<UploadResult>;
  getMetadata(key: string): Promise<StorageObjectMetadata | null>;
  download(key: string): Promise<DownloadResult>;
  stream?(key: string): Promise<NodeJS.ReadableStream>;
  generateSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult | null>;
  delete(key: string): Promise<boolean>;
  copy?(sourceKey: string, destKey: string): Promise<UploadResult>;
  exists(key: string): Promise<boolean>;
  verifyChecksum(key: string, expectedSha256: string): Promise<boolean>;
}
