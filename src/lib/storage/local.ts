import { createHash } from "crypto";
import { mkdir, readFile, writeFile, stat, unlink, copyFile } from "fs/promises";
import path from "path";
import type {
  StorageAdapter,
  UploadOptions,
  UploadResult,
  DownloadResult,
  StorageObjectMetadata,
  SignedUrlOptions,
  SignedUrlResult,
} from "./types";
import { resolveSafePath, validateObjectKey } from "./keys";

export class LocalStorageAdapter implements StorageAdapter {
  readonly provider = "local" as const;
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private sha256(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex");
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    validateObjectKey(options.key);
    const fullPath = resolveSafePath(this.root, options.key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    const checksum = this.sha256(options.bytes);
    if (options.checksumSha256 && options.checksumSha256 !== checksum) {
      throw new Error("Checksum mismatch before upload");
    }
    await writeFile(fullPath, options.bytes);
    // Verify written object
    const written = await readFile(fullPath);
    const writtenChecksum = this.sha256(written);
    if (writtenChecksum !== checksum) {
      await unlink(fullPath).catch(() => {});
      throw new Error("Stored object checksum verification failed");
    }
    return {
      key: options.key,
      sizeBytes: written.length,
      checksumSha256: writtenChecksum,
      provider: "local",
      bucket: null,
    };
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      validateObjectKey(key);
      const fullPath = resolveSafePath(this.root, key);
      const s = await stat(fullPath);
      if (!s.isFile()) return null;
      const bytes = await readFile(fullPath);
      return {
        key,
        sizeBytes: s.size,
        mimeType: "application/octet-stream",
        checksumSha256: this.sha256(bytes),
        lastModified: s.mtime,
        provider: "local",
        bucket: null,
        accessLevel: "PRIVATE",
      };
    } catch {
      return null;
    }
  }

  async download(key: string): Promise<DownloadResult> {
    validateObjectKey(key);
    const fullPath = resolveSafePath(this.root, key);
    let bytes: Buffer;
    try {
      bytes = await readFile(fullPath);
    } catch {
      throw new Error("Object not found");
    }
    const s = await stat(fullPath).catch(() => null);
    return {
      bytes,
      metadata: {
        key,
        sizeBytes: bytes.length,
        mimeType: "application/octet-stream",
        checksumSha256: this.sha256(bytes),
        lastModified: s?.mtime,
        provider: "local",
        bucket: null,
        accessLevel: "PRIVATE",
      },
    };
  }

  async generateSignedUrl(_options: SignedUrlOptions): Promise<SignedUrlResult | null> {
    // Local adapter does not support signed URLs; server-side auth must be used
    return null;
  }

  async delete(key: string): Promise<boolean> {
    try {
      validateObjectKey(key);
      const fullPath = resolveSafePath(this.root, key);
      await unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<UploadResult> {
    validateObjectKey(sourceKey);
    validateObjectKey(destKey);
    const src = resolveSafePath(this.root, sourceKey);
    const dst = resolveSafePath(this.root, destKey);
    await mkdir(path.dirname(dst), { recursive: true });
    await copyFile(src, dst);
    const bytes = await readFile(dst);
    return {
      key: destKey,
      sizeBytes: bytes.length,
      checksumSha256: this.sha256(bytes),
      provider: "local",
      bucket: null,
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      validateObjectKey(key);
      const fullPath = resolveSafePath(this.root, key);
      const s = await stat(fullPath);
      return s.isFile();
    } catch {
      return false;
    }
  }

  async verifyChecksum(key: string, expectedSha256: string): Promise<boolean> {
    try {
      const data = await this.download(key);
      return data.metadata.checksumSha256 === expectedSha256;
    } catch {
      return false;
    }
  }
}
