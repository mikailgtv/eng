#!/usr/bin/env node
import assert from "assert";
import path from "path";
import os from "os";
import { mkdtemp, rm } from "fs/promises";

async function run() {
  console.log("=== Phase 30 Storage Regression Tests (simple) ===");
  const { MemoryStorageAdapter } = await import("../src/lib/storage/memory.ts");
  const { LocalStorageAdapter } = await import("../src/lib/storage/local.ts");
  const { validateFile } = await import("../src/lib/storage/validation.ts");
  const { generateObjectKey, sanitizeFileName, validateObjectKey, resolveSafePath } = await import("../src/lib/storage/keys.ts");
  const { getPolicy, BLOCKED_EXTENSIONS } = await import("../src/lib/storage/policies.ts");
  const { validateStorageEnv } = await import("../src/lib/storage/index.ts");

  let passed = 0, failed = 0;
  const ok = (name, fn) => { try { fn(); console.log(`✓ ${name}`); passed++; } catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; } };
  const okAsync = async (name, fn) => { try { await fn(); console.log(`✓ ${name}`); passed++; } catch (e) { console.error(`✗ ${name}: ${e.stack || e.message}`); failed++; } };

  ok("sanitize filename removes traversal", () => { assert(!sanitizeFileName("../../etc/passwd").includes("..")); });
  ok("generate safe object key", () => { const key = generateObjectKey({ resourceType: "content", originalName: "test.png" }); assert(key.match(/^content\/\d{4}\/\d{2}\//)); validateObjectKey(key); });
  ok("reject traversal in key", () => { assert.throws(() => validateObjectKey("../secret")); assert.throws(() => validateObjectKey("/absolute")); assert.throws(() => validateObjectKey("no-slash")); });
  ok("resolveSafePath prevents traversal", () => { const root = "/tmp/storage"; assert.throws(() => resolveSafePath(root, "../../etc/passwd")); });
  ok("blocked extensions", () => { assert(BLOCKED_EXTENSIONS.has("exe")); });
  ok("reject invalid extension", () => { const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]); assert.throws(() => validateFile({ category: "content_media", fileName: "evil.exe", mimeType: "application/octet-stream", bytes })); });
  ok("reject empty file", () => { assert.throws(() => validateFile({ category: "content_media", fileName: "test.png", mimeType: "image/png", bytes: Buffer.alloc(0) })); });
  ok("validate magic bytes", () => { const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); validateFile({ category: "content_media", fileName: "test.png", mimeType: "image/png", bytes: png }); assert.throws(() => validateFile({ category: "content_media", fileName: "test.png", mimeType: "image/png", bytes: Buffer.from("hello") })); });
  ok("reject oversized", () => { const policy = getPolicy("profile_avatar"); const big = Buffer.alloc(policy.maxBytes + 1); big[0]=0x89; big[1]=0x50; big[2]=0x4e; big[3]=0x47; assert.throws(() => validateFile({ category: "profile_avatar", fileName: "avatar.png", mimeType: "image/png", bytes: big }), /exceeds max size/); });

  await okAsync("memory: valid upload and download", async () => {
    const adapter = new MemoryStorageAdapter();
    const key = "content/2026/01/test/file.png";
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const res = await adapter.upload({ key, bytes, mimeType: "image/png", accessLevel: "PRIVATE", originalName: "file.png" });
    assert(res.checksumSha256);
    const dl = await adapter.download(key);
    assert(dl.bytes.equals(bytes));
  });

  await okAsync("memory: checksum mismatch", async () => {
    const adapter = new MemoryStorageAdapter();
    const key = "content/2026/01/test/file.png";
    await adapter.upload({ key, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mimeType: "image/png", accessLevel: "PRIVATE" });
    const ok = await adapter.verifyChecksum(key, "deadbeef");
    assert(!ok);
  });

  await okAsync("memory: missing object", async () => {
    const adapter = new MemoryStorageAdapter();
    assert(!(await adapter.exists("content/2026/01/missing.png")));
    await assert.rejects(() => adapter.download("content/2026/01/missing.png"));
  });

  await okAsync("memory: safe deletion", async () => {
    const adapter = new MemoryStorageAdapter();
    const key = "content/2026/01/test/file.png";
    await adapter.upload({ key, bytes: Buffer.from("test"), mimeType: "text/plain", accessLevel: "PRIVATE" });
    assert(await adapter.exists(key));
    await adapter.delete(key);
    assert(!(await adapter.exists(key)));
  });

  await okAsync("memory: duplicate upload", async () => {
    const adapter = new MemoryStorageAdapter();
    const key = "content/2026/01/test/file.png";
    await adapter.upload({ key, bytes: Buffer.from("v1"), mimeType: "text/plain", accessLevel: "PRIVATE" });
    await adapter.upload({ key, bytes: Buffer.from("v2"), mimeType: "text/plain", accessLevel: "PRIVATE" });
    const dl = await adapter.download(key);
    assert(dl.bytes.toString() === "v2");
  });

  await okAsync("memory: path traversal blocked", async () => {
    const adapter = new MemoryStorageAdapter();
    await assert.rejects(() => adapter.upload({ key: "../../etc/passwd", bytes: Buffer.from("x"), mimeType: "text/plain", accessLevel: "PRIVATE" }));
  });

  await okAsync("local: upload and checksum", async () => {
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "storage-test-"));
    const adapter = new LocalStorageAdapter(tmpRoot);
    const key = "content/2026/01/a/file.png";
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02]);
    const res = await adapter.upload({ key, bytes, mimeType: "image/png", accessLevel: "PRIVATE" });
    assert(await adapter.exists(key));
    assert(await adapter.verifyChecksum(key, res.checksumSha256));
    await rm(tmpRoot, { recursive: true, force: true });
  });

  await okAsync("local: traversal blocked", async () => {
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "storage-test-"));
    const adapter = new LocalStorageAdapter(tmpRoot);
    await assert.rejects(() => adapter.upload({ key: "../../../etc/passwd", bytes: Buffer.from("x"), mimeType: "text/plain", accessLevel: "PRIVATE" }));
    await rm(tmpRoot, { recursive: true, force: true });
  });

  ok("env: local validates", () => { const orig = process.env.STORAGE_PROVIDER; process.env.STORAGE_PROVIDER = "local"; validateStorageEnv(); process.env.STORAGE_PROVIDER = orig; });
  ok("env: memory rejected in production", () => { const origNode = process.env.NODE_ENV; const origProv = process.env.STORAGE_PROVIDER; process.env.NODE_ENV = "production"; process.env.STORAGE_PROVIDER = "memory"; assert.throws(() => validateStorageEnv()); process.env.NODE_ENV = origNode; process.env.STORAGE_PROVIDER = origProv; });
  // Phase 36 (PG-35-02): S3 must be rejected because it is UNIMPLEMENTED, not because
  // variables are missing. Supplying a complete, syntactically valid S3 config must still fail.
  ok("env: s3 rejected even with a complete config (PG-35-02)", () => {
    const orig = { ...process.env };
    process.env.STORAGE_PROVIDER = "s3";
    process.env.STORAGE_S3_BUCKET = "synthetic-test-bucket";
    process.env.STORAGE_S3_REGION = "synthetic-region-1";
    process.env.STORAGE_S3_ACCESS_KEY_ID = "synthetic-access-key-id";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = "synthetic-secret-access-key";
    let err;
    try { validateStorageEnv(); } catch (e) { err = e; }
    process.env = orig;
    assert.ok(err, "a complete S3 configuration must still be rejected while the adapter is a stub");
    assert.match(String(err.message), /not implemented/i);
  });

  ok("env: s3 rejection does not echo credentials (PG-35-02)", () => {
    const orig = { ...process.env };
    process.env.STORAGE_PROVIDER = "s3";
    process.env.STORAGE_S3_BUCKET = "synthetic-test-bucket";
    process.env.STORAGE_S3_REGION = "synthetic-region-1";
    process.env.STORAGE_S3_ACCESS_KEY_ID = "synthetic-access-key-id";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = "synthetic-secret-access-key";
    let msg = "";
    try { validateStorageEnv(); } catch (e) { msg = String(e.message); }
    process.env = orig;
    assert.ok(!msg.includes("synthetic-secret-access-key"), "the secret access key must never appear in the error");
    assert.ok(!msg.includes("synthetic-access-key-id"), "the access key id must never appear in the error");
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
