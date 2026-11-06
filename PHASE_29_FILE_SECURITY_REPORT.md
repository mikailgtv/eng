# Phase 29 — File Security Report

**Upload/download tests:** NOT TESTED. Current staging backup is NOT VERIFIED; destructive upload/file probes were not performed.

## Static findings

- Message attachment and content media storage uses random server-generated storage names, sanitized display names, configured byte limits, extension allowlists, basic magic-byte checks, and `storage/` directories. Executable/script/HTML/SVG extensions are rejected. Files are returned as attachment with `X-Content-Type-Options: nosniff`; message/media downloads set private no-store.
- Uploaded MIME is client-supplied (`file.type`) and not independently mapped from detected content. Magic checks are shallow (e.g. ZIP signature for DOCX/XLSX, partial image signatures); malware scan, archive-bomb limits, image re-encoding, and storage encryption are NOT VERIFIED.
- Message attachment read checks conversation participation. Certificate download requires session and service checks token.
- **P29-004 candidate:** content media download checks only that record exists/not archived and viewer is not STUDENT; no uploader, organization, publication, course, or teacher-assignment check found.
- File path uses DB `storagePath` under fixed directory; write path is random+safe name. Traversal payloads and symlink behavior not tested.
- Signed certificate token scope, expiry, reuse and leakage NOT TESTED.

**Required tests:** unauthorized file ID, foreign tenant/course media, MIME spoof/polyglot, oversized payload, `../` and encoded traversal, signed token expiry/reuse, and storage path containment in STAGING.
