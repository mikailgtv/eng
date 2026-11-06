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

interface Stored {
  bytes: Buffer;
  mimeType: string;
  accessLevel: "PUBLIC" | "PRIVATE" | "RESTRICTED";
  originalName?: string;
  checksum: string;
  lastModified: Date;
}

export class MemoryStorageAdapter implements StorageAdapter {
  readonly provider = "memory" as const;
  private store = new Map<string, Stored>();

  private sha256(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex");
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    validateObjectKey(options.key);
    const checksum = this.sha256(options.bytes);
    if (options.checksumSha256 && options.checksumSha256 !== checksum) {
      throw new Error("Checksum mismatch");
    }
    this.store.set(options.key, {
      bytes: Buffer.from(options.bytes),
      mimeType: options.mimeType,
      accessLevel: options.accessLevel,
      originalName: options.originalName,
      checksum,
      lastModified: new Date(),
    });
    return {
      key: options.key,
      sizeBytes: options.bytes.length,
      checksumSha256: checksum,
      provider: "memory",
      bucket: null,
    };
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    validateObjectKey(key);
    const obj = this.store.get(key);
    if (!obj) return null;
    return {
      key,
      sizeBytes: obj.bytes.length,
      mimeType: obj.mimeType,
      checksumSha256: obj.checksum,
      lastModified: obj.lastModified,
      provider: "memory",
      bucket: null,
      accessLevel: obj.accessLevel,
      originalName: obj.originalName,
    };
  }

  async download(key: string): Promise<DownloadResult> {
    validateObjectKey(key);
    const obj = this.store.get(key);
    if (!obj) throw new Error("Object not found");
    return {
      bytes: Buffer.from(obj.bytes),
      metadata: {
        key,
        sizeBytes: obj.bytes.length,
        mimeType: obj.mimeType,
        checksumSha256: obj.checksum,
        lastModified: obj.lastModified,
        provider: "memory",
        bucket: null,
        accessLevel: obj.accessLevel,
        originalName: obj.originalName,
      },
    };
  }

  async generateSignedUrl(_options: SignedUrlOptions): Promise<SignedUrlResult | null> {
    return null;
  }

  async delete(key: string): Promise<boolean> {
    validateObjectKey(key);
    return this.store.delete(key);
  }

  async copy(sourceKey: string, destKey: string): Promise<UploadResult> {
    validateObjectKey(sourceKey);
    validateObjectKey(destKey);
    const src = this.store.get(sourceKey);
    if (!src) throw new Error("Source not found");
    this.store.set(destKey, {
      ...src,
      bytes: Buffer.from(src.bytes),
      lastModified: new Date(),
    });
    return {
      key: destKey,
      sizeBytes: src.bytes.length,
      checksumSha256: src.checksum,
      provider: "memory",
      bucket: null,
    };
  }

  async exists(key: string): Promise<boolean> {
    validateObjectKey(key);
    return this.store.has(key);
  }

  async verifyChecksum(key: string, expectedSha256: string): Promise<boolean> {
    const obj = this.store.get(key);
    if (!obj) return false;
    return obj.checksum === expectedSha256;
  }

  clear(): void {
    this.store.clear();
  }
}
