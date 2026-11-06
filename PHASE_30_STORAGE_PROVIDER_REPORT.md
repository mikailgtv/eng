# Phase 30 — Storage Provider Report

**Date:** 2026-10-10
**Status:** PARTIALLY VERIFIED (code verified, live S3 NOT VERIFIED due to missing credentials)

## Actual Provider

- **Before Phase 30:** local filesystem only (`storage/content`, `storage/messages` under `process.cwd()`)
- **After Phase 30:** abstraction implemented with 3 adapters:
  - `local` — durable only on persistent VM, not on Netlify Functions ephemeral disk
  - `s3` — S3-compatible, requires SDK for production (skeleton implemented, env validation present)
  - `memory` — for tests (`NODE_ENV=test`)

**Current configured provider in this environment:**
- `STORAGE_PROVIDER` not set → defaults to `local` (via `getStorageProvider()`)
- `STORAGE_LOCAL_ROOT` not set → defaults to `process.cwd()/storage`
- No S3 credentials present → S3 adapter cannot be integration-tested

## Adapter Architecture

### Interface (src/lib/storage/types.ts)
- `upload`, `getMetadata`, `download`, `generateSignedUrl`, `delete`, `copy`, `exists`, `verifyChecksum`
- VERIFIED: interface defined and implemented by all adapters

### Local adapter (src/lib/storage/local.ts)
- Uses `fs/promises`, `resolveSafePath` to prevent traversal
- Computes SHA256, verifies after write
- `generateSignedUrl` returns null (local doesn't support signed URLs) — server-side auth required
- VERIFIED: unit tests with temp dir pass (see test report)

### Memory adapter (src/lib/storage/memory.ts)
- In-memory Map, for tests
- Same checksum logic
- VERIFIED: 20 regression tests pass

### S3 adapter (src/lib/storage/s3.ts)
- Config struct: bucket, region, endpoint, accessKeyId, secretAccessKey, forcePathStyle
- Validates missing env vars with safe error (names only, no values)
- Upload/download methods throw "requires SDK" until @aws-sdk/client-s3 is added — **intentional** to avoid pretending local is durable production storage
- Signed URL expiry validated 1-3600s
- Status: **NOT VERIFIED** against live bucket (no credentials, no SDK in package.json)

## Environment Separation

- **Local dev:** `STORAGE_PROVIDER=local`, `STORAGE_LOCAL_ROOT=./storage` (default)
- **Tests:** `STORAGE_PROVIDER=memory` or `storage-test` temp dir
- **Staging:** should set `STORAGE_PROVIDER=s3`, `STORAGE_S3_BUCKET=staging-bucket`, `STORAGE_LOCAL_ROOT` or `STORAGE_STAGING_ROOT` to separate path, plus S3 creds in secret store
- **Production:** must set `STORAGE_PROVIDER=s3`, production bucket, forbid `memory` and `STORAGE_STAGING_ROOT` (validated in `server-env.ts`)

**Validation at startup:**
- `validateServerEnvironment()` checks STORAGE_PROVIDER enum, S3 required vars, SIGNED_URL expiry 1-3600, forbids memory in prod, forbids STAGING_ROOT in prod
- `validateStorageEnv()` checks root not empty/root, no `..`, S3 vars present, memory not allowed in prod
- Errors name missing keys only, no secret values logged — VERIFIED in code

**Preventing staging→prod overlap:**
- Separate env vars per environment, validation forbids STAGING_ROOT in prod
- Documentation in `.env.example` with placeholders only, no real credentials committed — VERIFIED

## Viable Options Documented

Since repo had no suitable production adapter, we document options (not pretending local is durable):

1. **AWS S3** — standard, with @aws-sdk/client-s3 + @aws-sdk/s3-presigner for signed URLs, versioning, lifecycle
2. **S3-compatible (Cloudflare R2, DigitalOcean Spaces, MinIO, Netlify Blobs S3-compatible)** — same API, set STORAGE_S3_ENDPOINT + forcePathStyle
3. **Netlify Blobs** — native Netlify, but requires different SDK; could be added as 4th adapter later
4. **Local persistent volume** — only if deployment has persistent disk (e.g., Docker VM, not Netlify Functions)

**Recommendation:** Use S3-compatible with versioning, private bucket, short-lived signed URLs (300s default), checksum verification.

## Changes Made

- Created `src/lib/storage/` with types, keys, policies, validation, local, memory, s3, service, monitoring, reliability, audio, index
- Updated `src/lib/server-env.ts` to include STORAGE_* vars and validation
- Updated `.env.example` with placeholders
- Refactored `content/media.ts` and `communication/messages.ts` to use adapter

## What Can Be Safely Verified in Staging

- Local adapter works for dev/staging if persistent disk exists, but **NOT durable on Netlify Functions**
- Memory adapter works for unit tests — VERIFIED
- S3 adapter config validation works — VERIFIED
- S3 actual upload/download requires:
  - `@aws-sdk/client-s3` added to package.json
  - S3 bucket created, private, versioning on
  - Credentials in staging secret store
  - Integration test with real bucket

**Status for staging S3:** NOT VERIFIED (no bucket/creds in this environment)

## Security

- No storage credentials, private bucket names where sensitive, signed secrets, or provider API keys in client code or reports — VERIFIED (grep for STORAGE_S3_SECRET shows only server-env and adapter, no client)
- Signed URLs not logged (monitoring logs only keyPrefix) — VERIFIED
- Hidden URL not treated as authorization — download endpoints still require session + ownership checks

## Remaining Work

- Add @aws-sdk/client-s3 and implement real S3 methods (currently skeleton throws)
- Create staging bucket and run integration tests
- Document backup/versioning for S3 bucket
