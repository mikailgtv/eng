# Phase 23 — Book Import Report

**Status: BLOCKED (write-free preview foundation only).** Existing Book and BookContentNode structures remain the source of truth.

## Existing architecture
`Book`, `BookVersion`, and hierarchical `BookContentNode` model book metadata, chapters/units/lessons/sections/exercises/quizzes, content JSON, mappings to existing course/module/lesson/activity records, draft/active status and versions. `src/lib/books/service.ts` supports staff-scoped book creation and hand-authored nodes, with initial version snapshot and audit events. No file import endpoint or workbook parser was found.

## Phase 23 addition
`src/lib/books/import-preview.ts` is a pure, non-persisting layer:
- CSV and structured JSON decode; CSV handles quoted commas, escaped quotes and embedded newlines.
- Strict row validation with duplicate-key, missing-parent, self-parent and parent-cycle errors.
- Content-bearing rows require a source, rights note and explicit submitter confirmation; metadata-only rows are allowed as preview warnings.
- Accepted output proposes `DRAFT` rows only and states `writesPerformed: false`.
- XLSX dispatch requires an injected decoder and refuses by default. No XLSX dependency is installed.
- `scripts/test-book-import-preview.ts` passes for the tested cases; script is `npm run test:book-import-preview`.

Rights confirmation is only a submitter assertion, not legal verification or permission. The helper does not ingest book text and does not write to the database.

## Blocking gaps
- No upload/UI/API route, file limits, asynchronous staging, mapping UI, existing-node matching or duplicate suggestions.
- No XLSX decoder; no malware/zip-bomb protection or workbook formula policy.
- No commit into existing Book/BookContentNode tables, review lifecycle, approved version snapshot, rollback or audit integration.
- No end-to-end validation that mapped materials are licensed and do not overwrite existing real content.

**High severity blocker — Book import.** Root cause: import pipeline is not integrated and XLSX security/decoder controls are absent. Required fix: stage uploaded files in isolated storage; use a reviewed parser and limits; preview/mapping/validation; require rights evidence and teacher review; create DRAFT records only; preserve versions; test in a disposable DB. Copyrighted content must not be auto-copied.