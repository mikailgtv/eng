/**
 * Phase 30 — Storage regression tests
 * Unit tests with memory adapter + validation tests
 * Integration tests against real provider are marked and require STAGING env
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStorageAdapter } from "../memory";
import { LocalStorageAdapter } from "../local";
import { validateFile } from "../validation";
import { generateObjectKey, sanitizeFileName, validateObjectKey, resolveSafePath } from "../keys";
import { getPolicy, BLOCKED_EXTENSIONS } from "../policies";
import { createStorageAdapter, getStorageProvider, validateStorageEnv } from "../index";
import path from "path";
import os from "os";
import { mkdtemp, rm } from "fs/promises";

describe("Storage keys", () => {
  it("sanitizes filename", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("..");
    expect(sanitizeFileName("my file.png")).toBe("my_file.png");
  });
  it("generates safe object key", () => {
    const key = generateObjectKey({ resourceType: "content", originalName: "test.png" });
    expect(key).toMatch(/^content\/\d{4}\/\d{2}\//);
    expect(() => validateObjectKey(key)).not.toThrow();
  });
  it("rejects traversal", () => {
    expect(() => validateObjectKey("../secret")).toThrow();
    expect(() => validateObjectKey("/absolute/path")).toThrow();
    expect(() => validateObjectKey("no-slash")).toThrow();
  });
  it("resolveSafePath prevents traversal", () => {
    const root = "/tmp/storage";
    expect(() => resolveSafePath(root, "../../etc/passwd")).toThrow();
    const safe = resolveSafePath(root, "content/2026/01/file.png");
    expect(safe.startsWith(root)).toBe(true);
  });
});

describe("File policies", () => {
  it("blocks executable extensions", () => {
    expect(BLOCKED_EXTENSIONS.has("exe")).toBe(true);
    expect(BLOCKED_EXTENSIONS.has("js")).toBe(true);
  });
  it("enforces allowed types per category", () => {
    const policy = getPolicy("content_media");
    expect(policy.allowedExtensions).toContain("png");
    expect(policy.maxBytes).toBeGreaterThan(0);
  });
  it("rejects invalid extension", () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(() => validateFile({ category: "content_media", fileName: "evil.exe", mimeType: "application/octet-stream", bytes })).toThrow();
  });
  it("rejects empty file", () => {
    expect(() => validateFile({ category: "content_media", fileName: "test.png", mimeType: "image/png", bytes: Buffer.alloc(0) })).toThrow();
  });
  it("validates magic bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateFile({ category: "content_media", fileName: "test.png", mimeType: "image/png", bytes: png })).not.toThrow();
    const fakePng = Buffer.from("hello world");
    expect(() => validateFile({ category: "content_media", fileName: "test.png", mimeType: "image/png", bytes: fakePng })).toThrow();
  });
  it("rejects oversized upload", () => {
    const policy = getPolicy("profile_avatar");
    const big = Buffer.alloc(policy.maxBytes + 1, 0x89);
    // Need valid magic for png to reach size check
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47;
    expect(() => validateFile({ category: "profile_avatar", fileName: "avatar.png", mimeType: "image/png", bytes: big })).toThrow(/exceeds max size/);
  });
});

describe("Memory adapter", () => {
  let adapter: MemoryStorageAdapter;
  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
  });

  it("valid upload and download", async () => {
    const key = "content/2026/01/test/file.png";
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const res = await adapter.upload({ key, bytes, mimeType: "image/png", accessLevel: "PRIVATE", originalName: "file.png" });
    expect(res.checksumSha256).toBeDefined();
    const dl = await adapter.download(key);
    expect(dl.bytes.equals(bytes)).toBe(true);
  });

  it("checksum mismatch detection", async () => {
    const key = "content/2026/01/test/file.png";
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await adapter.upload({ key, bytes, mimeType: "image/png", accessLevel: "PRIVATE" });
    const ok = await adapter.verifyChecksum(key, "deadbeef");
    expect(ok).toBe(false);
  });

  it("missing object", async () => {
    const exists = await adapter.exists("content/2026/01/missing.png");
    expect(exists).toBe(false);
    await expect(adapter.download("content/2026/01/missing.png")).rejects.toThrow();
  });

  it("safe deletion", async () => {
    const key = "content/2026/01/test/file.png";
    await adapter.upload({ key, bytes: Buffer.from("test"), mimeType: "text/plain", accessLevel: "PRIVATE" });
    expect(await adapter.exists(key)).toBe(true);
    await adapter.delete(key);
    expect(await adapter.exists(key)).toBe(false);
  });

  it("duplicate upload overwrites with versioning handled by caller", async () => {
    const key = "content/2026/01/test/file.png";
    await adapter.upload({ key, bytes: Buffer.from("v1"), mimeType: "text/plain", accessLevel: "PRIVATE" });
    await adapter.upload({ key, bytes: Buffer.from("v2"), mimeType: "text/plain", accessLevel: "PRIVATE" });
    const dl = await adapter.download(key);
    expect(dl.bytes.toString()).toBe("v2");
  });

  it("path traversal attempt blocked", async () => {
    await expect(adapter.upload({ key: "../../etc/passwd", bytes: Buffer.from("x"), mimeType: "text/plain", accessLevel: "PRIVATE" })).rejects.toThrow();
  });
});

describe("Local adapter", () => {
  let tmpRoot: string;
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "storage-test-"));
    adapter = new LocalStorageAdapter(tmpRoot);
  });

  it("upload and verify checksum", async () => {
    const key = "content/2026/01/a/file.png";
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02]);
    const res = await adapter.upload({ key, bytes, mimeType: "image/png", accessLevel: "PRIVATE" });
    expect(await adapter.exists(key)).toBe(true);
    expect(await adapter.verifyChecksum(key, res.checksumSha256)).toBe(true);
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("prevents path traversal", async () => {
    await expect(adapter.upload({ key: "../../../etc/passwd", bytes: Buffer.from("x"), mimeType: "text/plain", accessLevel: "PRIVATE" })).rejects.toThrow();
    await rm(tmpRoot, { recursive: true, force: true });
  });
});

describe("Environment separation", () => {
  it("validates storage env", () => {
    const original = process.env.STORAGE_PROVIDER;
    process.env.STORAGE_PROVIDER = "local";
    expect(() => validateStorageEnv()).not.toThrow();
    process.env.STORAGE_PROVIDER = original;
  });

  it("rejects memory in production", () => {
    const origNode = process.env.NODE_ENV;
    const origProv = process.env.STORAGE_PROVIDER;
    process.env.NODE_ENV = "production";
    process.env.STORAGE_PROVIDER = "memory";
    expect(() => validateStorageEnv()).toThrow();
    process.env.NODE_ENV = origNode;
    process.env.STORAGE_PROVIDER = origProv;
  });

  it("requires S3 vars when provider is s3", () => {
    const orig = { ...process.env };
    process.env.STORAGE_PROVIDER = "s3";
    delete process.env.STORAGE_S3_BUCKET;
    delete process.env.STORAGE_S3_REGION;
    delete process.env.STORAGE_S3_ACCESS_KEY_ID;
    delete process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    expect(() => validateStorageEnv()).toThrow();
    Object.assign(process.env, orig);
  });
});

describe("Audio", () => {
  it("validates duration", async () => {
    const { validateAudioDuration } = await import("../audio");
    expect(() => validateAudioDuration(0)).toThrow();
    expect(() => validateAudioDuration(200)).toThrow();
    expect(() => validateAudioDuration(10)).not.toThrow();
  });
});

describe("Signed URL expiration", () => {
  it("rejects invalid expiry", async () => {
    const { S3StorageAdapter } = await import("../s3");
    const adapter = new S3StorageAdapter({
      bucket: "test-bucket",
      region: "us-east-1",
      accessKeyId: "key",
      secretAccessKey: "secret",
      endpoint: "https://s3.example.com",
    });
    await expect(adapter.generateSignedUrl({ key: "content/2026/01/file.png", expiresInSeconds: 0, operation: "GET" })).rejects.toThrow();
    await expect(adapter.generateSignedUrl({ key: "content/2026/01/file.png", expiresInSeconds: 5000, operation: "GET" })).rejects.toThrow();
  });
});
