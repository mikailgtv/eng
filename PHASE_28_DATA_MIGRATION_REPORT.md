# Phase 28 — Data Migration Report

**Audit date:** 2026-10-07

## Status

**NOT EXECUTED — BLOCKED pending verified backup destination and a real staging PostgreSQL target.** A read-only source inventory was explicitly authorized and completed; no source data was exported, transformed, or imported.

## Read-only source baseline

Authoritative source selected for this baseline: `/home/user/prisma/dev.db` (4,517,888 bytes). It was opened in SQLite `mode=ro` with `PRAGMA query_only=1`; no writes occurred.

- 213 physical tables; all 213 Prisma model/table names matched, with no missing or extra table names.
- 3,716 total rows across 123 nonempty tables.
- `PRAGMA integrity_check`: `ok`; `PRAGMA foreign_key_check`: 0 violations.
- 9,057 null cells across columns declared nullable; 314 unique indexes checked, with zero duplicate non-null key groups.
- 13 user rows use the `@demo.example` email domain. No email, name, password, or other record value is reproduced here.
- Database SHA-256: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`; SQLite schema SHA-256: `edc4017d8b310c1675ac9c4e59a3c950dba7892cfb0fdbea42fc958663a3a25d`; checked-in `schema.prisma` SHA-256: `559a211a8e79be6d0946a629c7e6cf52cdeb8c713298ce4e0d1590c942088431`. Package version is `0.1.0`; Git revision unavailable.
- The per-table appendix below records row count, primary-key column names, key-set SHA-256, and full-row SHA-256. For binary columns the digest canonicalization stores only byte length and content hash; no row value is included.

Existing files `prisma/dev.db.phase20.bak` (4,354,048 bytes) and `backups/phase20-local-dev-db-post-change-20261005.sqlite` (4,517,888 bytes) were not opened, hashed, copied, or modified; neither has been verified as a restorable backup. The Phase 27 disposable DB is not a migration source.

## No data-migration claims

- PostgreSQL target row counts / import / reconciliation: not run.
- Source/target ID-set comparison: not run; the source key-set hashes below are a baseline only.
- PostgreSQL null/unique/FK/orphan validation: not run.
- Backup/restore: no new backup or restore test was performed.

## Safe migration design, pending approval

1. Identify one authoritative SQLite source; freeze or define a consistent snapshot window.
2. Create and verify a timestamped backup outside source/public paths before reading/importing. Preserve existing files and backups.
3. Record application/schema revision and per-table row counts, critical IDs, unique/null/FK counts, and checksums where feasible.
4. Build an empty staging PostgreSQL schema through reviewed versioned Prisma migrations. Prisma migration files define schema; they do not copy SQLite data.
5. Export/import with a repeatable ETL process preserving existing string/CUID/natural/composite keys. Derive FK order from the actual schema graph and account explicitly for cycles; do not silently drop or remap rows.
6. Compare source and target table counts, key sets, null/unique/FK checks, and checksums; report every mismatch and root cause. Keep the source immutable until acceptance and rollback window end.
7. Run actual application workflows on staging PostgreSQL, then obtain separate written approval before any production cutover.

No production or local persistent database was modified.
## Appendix — per-table source row counts and checksums

Only table names, counts, primary-key column names, and cryptographic digests are listed. No row values are present. The full-row digest hashes canonicalized rows sorted by declared primary key; binary values are represented by their length and SHA-256. These digests are intended for later before/after comparison using the same canonicalization.

| SQLite table | Rows | Primary-key columns | PK-set SHA-256 | Full-row SHA-256 |
|---|---:|---|---|---|
| `access_review_decisions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `access_reviews` | 11 | `id` | `e1ad547fd752aa02f5a8d8459e10fe1cff25e21ddea1acb6770c29e6c528d031` | `1c9a34208b462f1aae4bf3d9ddd2f3e06044ce230413298444e4c8ee9bb216df` |
| `account_security_events` | 232 | `id` | `83380a4e53871e5d0124e1b8f2ee486270f5d947ff022eb3e953be98aec09a3c` | `b37e1ab8babf4fd962595894c06e64d5fc1269e196cb5e1b179097b8fb101edb` |
| `activities` | 71 | `id` | `840cd7e2753572d238e4c9a3deba28b5703f984b4294baae2a35b94e4e73e760` | `a15da283da1a67b7434cc35398a1319f48646498991a49959af92fc79c4c52bd` |
| `activity_attempts` | 4 | `id` | `45a67bf8ab8dd01acaa27c425e5d94d9b84137f4d4bda27d728f8f800277d5c9` | `0f2dfae8dda38e4c0f5ed6c4c0415aeca96bc29902c4c48166a83d0fd0cc49e2` |
| `activity_vocabulary` | 41 | `id` | `dcb13ce1ad6c3fb383c20d894ab8eed25b3d4819e159fde8b61f093a2b9f983a` | `b9da3330203b006a65877ade3257c41f5f921d949f4889b7ee18c9fc88794d8e` |
| `adaptive_assessment_events` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `adaptive_assessment_sessions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `adaptive_rules` | 1 | `id` | `e4ebe5ecd8d7c4074bc5910e60eb020eece626c2de47e8f0539b41276b78426f` | `2b2b28ef8bd465321fe16e0df21d7acd6e00281b59e0183a2a2e277e78ed9630` |
| `ai_feedback` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `ai_generated_content` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `ai_messages` | 8 | `id` | `f27b4f565c763046a682d9dcec8450b28456d99479930ac103a5762b07fa234c` | `1d1f185c5c2655101727d4976599dfdbda2617a8138326047c1d74d2df6359d1` |
| `ai_recommendations` | 2 | `id` | `66bc154023f58a843787bd2f809bcd35b507c211986207072a324c328015d317` | `c475b9717c72989b618194ba6f9b39f8d3c394e34cbc442b94d3be60617bd8f5` |
| `ai_sessions` | 4 | `id` | `891ccb4cafa607c5031e875079854958c56c391f21e083cd7cd38e6613ea91db` | `b45d110e929af834403bea28ab4a6e3149ea484e175492a79406be4d5993a62a` |
| `ai_settings` | 1 | `id` | `6890bd71542af01729bf31093876da4eca8f774b21951a66ddb6153f35fda75f` | `87d8e9d3d936f88c89e376acf5e29b9e079f9daa15285f1bd58f956a99b2036d` |
| `ai_usage` | 6 | `id` | `b27b121233d7855891c069748b1ae608ae3a3bfb218cc68f6f1c0791d78d03ef` | `4de8113ac4ccbab218972fdddce44f5af965d286219f562e1742ce55880fcd97` |
| `announcement_acknowledgements` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `announcement_targets` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `announcements` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `api_client_credentials` | 18 | `id` | `3a270ebe44083e7182559828b6570d271854cd85e3db8154513be04d0c95aef2` | `1c8f1e8139d1cbfc7b4115ff03d6014508c7572369f756d2654ed180b7e877b9` |
| `assessment_accommodations` | 6 | `id` | `52b29bff4b821aba97e909326578ed0fa8400bcd62972117080d4d9ddf0fcb36` | `c5e9e669887530f11dc252648e531739b545a3b8fa0815797808fc8989c55864` |
| `assessment_answers` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_attempt_events` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_attempt_snapshots` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_attempts` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_blueprint_versions` | 6 | `id` | `398caf51131b56fadee76e591977db66f9dede7412952bd4f860bb6ba1604ab1` | `a5146c9ac97b4d02c8d449c496c0049a4bc38c5e046f5d442e032b8616f3a6ba` |
| `assessment_blueprints` | 6 | `id` | `a376159de9e3fba7c7cfa9b364a3e911760ece9c0a2c543cb3d0d28e956eed81` | `24560734c73f0f293553f5868b214c6159dfb7c4fc2b3fa1551e2b6848fb8dc6` |
| `assessment_corrections` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_diagnostic_profiles` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_distractor_statistics` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_item_statistics` | 6 | `id` | `aed62c3f06e82f4505c1c266b7734f558e219a094ddd050f8581fe42bd320b27` | `9772c348c9b1aee25e5c4dd8808bc585ee20abe860ad45160f51a1a2c15e90c6` |
| `assessment_quality_checks` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_question_pools` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_questions` | 51 | `id` | `be8c934c3f9d6cdeb1a1dfc27ee0edd4a77d7f6c05179e048a2b784e6f28b1c4` | `c8de967d135bced481d1e168040ce7732aeaefae8110544bf94c8c20bc6139ab` |
| `assessment_report_snapshots` | 6 | `id` | `ae171851fb7e0b0d97101b608d287040e9bac87b40a3f68425b91fb3dda0c442` | `2793cb8adeacee7b2be41c2061c3fe1a6ef301b5ef01550b53457656c7580a2b` |
| `assessment_retake_policies` | 1 | `id` | `7b89d8ae1bff7aeb1a187a2e31386a77dda916bf7e11a9f7a02e740253f37d07` | `52dd72ea4dee2b0a49752ad7d77dd37067c48a673e4e79f84d3ea9cc738bbb80` |
| `assessment_retention_policies` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_review_queue` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_rubric_scores` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_speaking_submissions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `assessment_variants` | 12 | `id` | `cdac8dd28c709c018301f92ba6b67ab99fc368614c6bbfc5058ccaa99321e989` | `ce782922035d8378c3201dfc1a7a092751c7fcf82e0193efe11bbef9f16afb42` |
| `assessments` | 4 | `id` | `16582bf3fc2161386557e101d90513f9d3c92e70825ec5ccf432140f1804bfb5` | `a04c3e034469a333029ed24ab38b8057108e2e2f3e0f42c7dede24d651ba4c28` |
| `assignment_submissions` | 7 | `id` | `2371d11522693f1dba581aeab981834e72ea21b100bb34ba128b05f44fb684ac` | `68bf40cb0fb4c7498aca3368a095e4c3f7f2fee0f58378e4991d1a1f6be282e0` |
| `attendance_changes` | 14 | `id` | `db1fb703d9d7f5a02a1e69ebcee496f8f6eecfa4d53c79c1372df47b8d058b58` | `2628d1306064124e3ddc5c88b24371909612c3c5903cb66ec58fc143b5da6007` |
| `attendance_records` | 7 | `id` | `3b7baf8d2dc8b92289c6d1b5a80b3739e15906742adf6070adebc6171cf920ac` | `defbd8bd06203e27b85525f8757bdaa8c50405ad8e9e7ef91e1c54348ef14eef` |
| `audio_assets` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `audit_logs` | 647 | `id` | `06bb9ba1a62a49cccb7e624039b3f319c8b835252211e416eb94f1bc963cc68d` | `78e7b428385b186a5781212f97fc2ebc874675c88c9082a323fb474209517d83` |
| `badges` | 8 | `id` | `da6ade6a32b512609dad1d88b5ba43246ec44df777a4c2bcbfe9a584cad9fcff` | `bce74ec98d11c23e053223ce5b0064bb4941511f2a9f37ac1ce4c8b27ba4c718` |
| `book_content_nodes` | 21 | `id` | `9439ba2cd11d0a9bef14769cee9775c56e1be66e707cc5b4fc4e5cbb45e7d59d` | `60dbfa090625e11733b47a19480692db73f2c735c060135c29303912ed0465e2` |
| `book_versions` | 1 | `id` | `835c9641745451a1067475a72b00cb6469c2a18ca262e08e0291fda8c142c287` | `d31262ff0e79d30355a72af8ec5d63d84f43b21003f1171082e8e19589077fd5` |
| `books` | 1 | `id` | `ab31d8ea4d36fcbc4bd0fb963c709c7639f19e765eaf6b606dc0d99a9cf1a79f` | `1167be01abae93ba57f7461e45c5f8252db191a176a1924190456a42a4ff7c84` |
| `calendar_sync_mappings` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `certificate_preferences` | 1 | `userId` | `ddf7e8ba9356accce3d740b923ee886a6409d0bff30e81f11c11597630dedd8e` | `fd5febcf987691716231f03af9bcff327b7f9e8e9ac99aa4064a2595cb5f8da8` |
| `certificate_revocations` | 1 | `id` | `2401188d841c3f2a95ca23c05e07327341e3186ca66facaaa81b697a6706ba0c` | `db33e66c6fb7fae6904580484de7ffdea1f830ebf649407b07da4782c900dda2` |
| `certificate_sequences` | 1 | `id` | `778d97ebedddb7f6da740464caa6774e318c23b2de3ed3640528c7cdcfa04b5d` | `a65e9cb077e0aff60218b0bd19e5ff6e10ffa0981f2113656de487aa811c62f9` |
| `certificate_signatories` | 2 | `id` | `09d67596bc018b9d67588e0aa8d5942755734535478f062361e895714bd854a2` | `5901cc80fa4ed455f8cc75a142f6ae45f0677225d53dd7a6ae2b3b21a9547542` |
| `certificate_templates` | 2 | `id` | `625c4ed0b30d20cc2dc647e091bb62493a40c8307ca581a7999586972a3c6559` | `619c86f307c14f8733d364fca202fbbfc19e872f7a896c6446a8306ca818608a` |
| `certificate_verifications` | 12 | `id` | `939d9ce1b38382c379ce308c59f06634eb6ff8dde6a04c2c063e5f554c97e22d` | `77e8abbec0a9e639472ebca3db0d5e513b2abe6c94f527f676933795b4180f8d` |
| `certificate_versions` | 5 | `id` | `78f1e95132e1c134344e9dbaa502ffa6969a73349369c16b5c2838111ca44a3f` | `4ed40a66dc7fed053bcaa54b9abd057b9fb883d83283a1f27f7c53e43e01fd09` |
| `certificates` | 5 | `id` | `2200754c13e0e0c0fb74d45538c4b1b887af684ed64c5a24ab04fe2da0b06f11` | `baf68a97abc8f48ab034f12e224395cf597d6495a79217aee2f0c97289630b44` |
| `certification_settings` | 1 | `id` | `fc2c5d82fbd134507c90ffe311356b5670c547b9cd599d7d0b938da21810500c` | `952d58f07a80290aa143fc0abc1a9cbf9a711b3a1f78def134af990f8d77a7c5` |
| `challenge_participants` | 5 | `id` | `adea0ea00a0780f75a0ef96182baea3790aad2a1d33fd951ec38c33445dca123` | `36d42708d07143eb16eadcc679b0857d749e6679f149823c84553bba0520efe5` |
| `challenges` | 3 | `id` | `244b720287a64a2463f9fba7235d74ec9dade91928f7c5d64f4128298ac64c68` | `3607d5b8d2f86108548fa34a473cda8e1005ef9f88de5872370d9e6c7c64a888` |
| `class_assignments` | 15 | `id` | `6e5ffe4a12b22fa1f3421e7a401f843d44a1ac28ffafd35705f8fabc619ed594` | `dae90e319871ae59928408b75d66d6e151d443aa82b8bbae98625640f385153a` |
| `class_sessions` | 15 | `id` | `53ebf45e7c4f9fc97ea87201ff8fcc2c05a2b08279933fc92ec1dcd28c2f2cd7` | `a072027cc95970dad06891c0de71fdb98cf747b6165c95063ecb06e1ca1cf1ed` |
| `communication_preferences` | 0 | `userId` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `communication_settings` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_ai_drafts` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_assignments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_comments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_item_tags` | 0 | `itemId,tagId` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_item_usages` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_items` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_media` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_metrics` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_overrides` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_prerequisites` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_quality_checks` | 40 | `id` | `45c07c438b4448eb0b9fe0a8c9488b353c506b3da67f859b0045bfc825b7a21a` | `88c3fe7705df30f770ae9870a605c2f7dd08e4c2e99a8b40c0caa57d7152da1f` |
| `content_releases` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_reviews` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_settings` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `content_tags` | 14 | `id` | `46c21cd867c00c6be03f95dafb7d0f201aa9361b4ccd5136c3611cfdc0f9579f` | `5b4461a7b2dbea1f4edce7557f8791bccdda75088a85a42093ca99a07d008097` |
| `content_versions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `conversation_participants` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `conversations` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `course_assignments` | 20 | `id` | `e8d5e448e038d2554c2e2ddd5c34b55ed936ae87e3b469af92d81696bee642b8` | `4651db9194919498a3624de1d1af432167d887003aa6a69693d709a0ec97b776` |
| `course_completion_records` | 2 | `id` | `7a2792c58c287c8480d3211bf5f87973c1e2e33e3a45368018436b203fa8b269` | `7ca76022595071ed955ad5786ce553298350fe9b36165aa47a82b260e2dbaba8` |
| `course_completion_rules` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `course_versions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `courses` | 4 | `id` | `37d10d5ef86364ffa379b1256f3898c19cd53c870295661b9fa3ae1d68b1f030` | `7c24be5624d9e05d7b5f4b272312c8220b6f328644da9d3050161d83865b3a01` |
| `curriculum_versions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `curriculums` | 2 | `id` | `2d58edfcfcc434d3ac1f9cfd1360c48c5674afa8c7b88f373b427b264a3a9573` | `6b3dcf41a2d1228d25cb9ba2c7dded8728f9d98c91f1d00fc9f62fe69ae6ec5e` |
| `daily_learning_plans` | 4 | `id` | `d4d796dc63f7389ad279509e32d3e9fbcafe9ef0cf7816a1dcfd74f1167e4fc8` | `4d67203dd4f6fa6fb561f63739967f992d2500e77409ae6c5fb6998cf9d99a79` |
| `delegations` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `departments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `external_data_import_batches` | 15 | `id` | `3222248cdde3d5031a533f165748bd8a00f2c21c18f3529aead46ee40b0d5331` | `0a246c697843f7bab585164815a358fc2acc9c1dd56abc93a8d8390fd52f3cfa` |
| `external_identity_links` | 14 | `id` | `a5d83ce3c6d1e4928765e07dc1967c016799ffe9779e28fa1d8372407d4d7407` | `7f1e8b1ff4892bac522ba00be64018d939d7a8d38e7212cac69b24d6a9cc014f` |
| `gamification_profiles` | 5 | `studentId` | `634e6c785655a403b786bc7279a39bb50c1331a6af907a199b1f3de618c80e2f` | `c80bbff1d05c4a918ae6eba7a2537d5c3da35640f99de09c2433fcfdb0425356` |
| `gamification_settings` | 1 | `id` | `11211365e76e815c3c02b5aa8439e15fd6df1f8a7f78a6807e2669cd4bb8de05` | `45d96f7aa1ef3dd4d91bdf8180615ba722f69dc4d8804c99ceb168162fe2e803` |
| `grammar_content` | 6 | `id` | `cbd32b9241847fb1013bc18cc9d3281fa570e5bab46335b8437757a74bd3139d` | `6968e36c0422d59434c1ce36ec720cb5877e3ec2f3389266c222dbcff4ee1e83` |
| `group_challenge_progress` | 1 | `id` | `262c352151b1926b91abeda12e0762a1bbed62a3790bc4c6ccb81a6fbfe375a5` | `d1254ae1a8e42f0176a0f9e153aad5b578044abeba51a52462c4dfb4173852a3` |
| `group_challenges` | 1 | `id` | `30b3068dc2af1a35425cd14c3e37f9962b7d90d399d64b3c462e53865255bacd` | `b944b54a8ec95e784cfcbd94cfcc8f23724d61678570d1f0c382b3ce66d80699` |
| `import_batches` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `integration_connections` | 13 | `id` | `263f9dd319f187dd4f99313ab4b81b8c50af4ff20f41a6e07876a1d08e1f5b36` | `67697fc944ff9fcc5e6e621c7b4722e3883c5f9010b2e6dc1679d7df92537cbb` |
| `integration_credentials` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `integration_field_mappings` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `integration_logs` | 17 | `id` | `8553a1c4b63cfff5fa16fdd148038d3b4b7588b1c8019173746f4a854caea0ec` | `7b6887b76a72b212a78510ebc4e1a3de85985f120fa79399e327a0e1275decc9` |
| `integration_sync_jobs` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `knowledge_items` | 1 | `id` | `13a234a6e637137733fe48ee1dedf9ffb2bc290974db46dab4575b21beecda22` | `9662b33943351e0b2a99419bdccb1b2bd12e95d9db43f079933bf7fab9765f23` |
| `learning_events` | 32 | `id` | `85601a040f1d799ebc810562b9b9822c823c79493fa81d463c2b597a08c22d3b` | `80d5bb6c570699dd6eb6b30569c2f502ce0c91ceb29f99cd105d001b2b433b97` |
| `learning_goals` | 3 | `id` | `05edc0397d84c291e56cec87698df08b811ded8937f123cba00ebf73413e0a30` | `b6859d1079388a97ec6117378ef55ef52f760023a74640746fcba08dd94b4449` |
| `learning_groups` | 5 | `id` | `a5de1cefe8fa07461d4c8d7077dff2636022daabf20d41851b26ed76d6d4f512` | `d0d6140bcf5eb657e479039e2d082e6728448220755c966e83232c36778aba15` |
| `learning_levels` | 12 | `level` | `5f4c57143c2a2d5e29e8bb123c44bcfde176cbd25eff96fe15368ecf52f0adc8` | `944fa9fd19dc6996edc1365f5950cd47be67c44b7770f186d05f5a139b506240` |
| `learning_objectives` | 20 | `id` | `cb4a08db1f19fb788c4e34d0c14bfcf58a3ebc0808ffdbd3973e21601e10a71e` | `ad2484b6fb7805c846479c0e05c59ad197afa40fe02dbdbfa5bfb96709fa6449` |
| `learning_recommendations` | 30 | `id` | `395e36fc3fb1fc365245d06a84836e059966c07cadbb6aa8505a5700367fe032` | `28c032188d53d140684ce41d9256c7464171fa17250c03c03aefc0e1445e8d4b` |
| `learning_streaks` | 1 | `studentId` | `225b2e91cac53fc2d6f2f3dd9c55d945bf3597f8f0ab4b2ccd8e5204635d2ded` | `c05c2dc0e81d9ab5373fb9ce892383f0bc76ef4918f6bbc19897d2aa0c186d50` |
| `lesson_content_blocks` | 156 | `id` | `d7b64059cd25be88003b0065d4efe8687b88b0c9f13ccbd0b5e9853e25edd802` | `4b77819655b9f991b07713ccbc1f16bee14e2eb5377541e45dc90084bf795206` |
| `lesson_drafts` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `lessons` | 39 | `id` | `7062a06d65ad2b27451a9b2b98d6ca80c23002be2b4f95413f0b5b4504a21c9f` | `57f85e919eb421dee55d352c393242f840c4e5f924982aad5036c3dc9488da0b` |
| `level_access_policies` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `levels` | 7 | `id` | `2223e3a74b107a50e612fc95e3094d196dd0f7050f309d355b0a3199aa5e7c91` | `6e93860b62bc6342ddcd35a0c974a9457bdea10dcffe7a1b2069db541830d3a8` |
| `listening_assignments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `listening_attempts` | 6 | `id` | `4c6e8a546bae41e9242a8b5968e652f63f350b3a622183003df118e8311114f2` | `e6d2434a406ae5cb718e6c25a94b2e46e29fd4760fe33048ea238139861bbd13` |
| `listening_exercises` | 1 | `id` | `3e04bd39aaa3e14fd0ffba03da5ed0cfacdc65df3bfed6377fe11b261ce766b6` | `1010c2110db7467d7d319e44df19690e310fb7102ba895c7701c0f2421f82e03` |
| `login_attempts` | 210 | `id` | `73ac44db9d2aba3ebe0a76a5e29e85608fe11fab257de13403ca42a7a08482aa` | `5558179ca38088866034c256086fa676fe16038f399e32b7ca9a09cd854465f9` |
| `mascot_reaction_logs` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `message_attachments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `message_revisions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `messages` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `mfa_backup_codes` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `mfa_challenges` | 11 | `id` | `376bcf9b237e1ad2e69d546471e4abafa298e03d46ef0940ffc12544c9afe02f` | `c32789b5357ed00c1a7d7000c44dc670a17a95bbf2f33c212f329117a89ad8ae` |
| `mfa_methods` | 1 | `id` | `7e85470d615c0ba74eea114b7b04c5d406b262c40a2e8e1753a4c0fca0238bdd` | `fc650fcfc38e6c5cbd766832c7e7b4ddc9ef2e3ab37541b0a1fbf0659a9df937` |
| `milestones` | 4 | `id` | `f8069fc9dfe47ae4be2f8c1b9ff538bdffdaebaa918679b4881468222625de2c` | `b5e0b9cfbca990aac2a08d66112bc94269b18182ee11abedbd0c35896151cef0` |
| `modules` | 9 | `id` | `a409570581e25fbdc40df5cf324ee9901f650cad9f5cd79c2945afdef5595d89` | `acf3364ac14dd325b9b1bebbf5c63def34edc5438185f6816210c790a380eaae` |
| `notification_deliveries` | 258 | `id` | `980180f3bcb0346cebbbd73da68a6863bbcf86b53af71b1c3991d013fba1e2ba` | `b40087c3d24f7ad4018db2e79f663ccb9feccd69e3f31f0abc7d8480d58eb77c` |
| `notification_preferences` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `notification_rules` | 14 | `id` | `1c5865f10d037686c5f3f704ac21d64bd2e784e352db5cfa5765aa6191ee7a2f` | `9a2e094b6d384db788bcf891c7a3075d063908a84b82d70a012ba31503fc13b6` |
| `notification_template_versions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `notification_templates` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `notifications` | 318 | `id` | `9d67cc4a1633d4316cb2fe1fb8bd6e55250e63c54bf504a0c7dde33430056601` | `07f79c2e12deaba062aa551cd2386c7eaa14a0c99c8d323c384e5949f3869d09` |
| `organization_settings` | 1 | `id` | `7b499731daa128ccf3876625853d18026593b6058704a3cf597823edc7b6ac5f` | `7be4f93531ea9f6e2a9eca92e9761e732f4639530549b0984fb5dd0352440da0` |
| `organizations` | 1 | `id` | `59e9b210a9dc3637c1d792a8cb73fd30e771a5ca51cf9fd166a471325f835eda` | `8f3ffe9e10df09b7def702682709c7ce64c0592c969472bedcde25365796061b` |
| `password_history` | 5 | `id` | `dc919e115bc45151ce0a7e698b8e7939e7de076e8447ffd70b83fd3a8e8fc54d` | `768c9d8c3d914c826f3933f15ec72b889c8cc521d1c8c13a4e105c7410028e12` |
| `permissions` | 49 | `id` | `d20e414861d488608cf7643ea60aa09f203fc66846664201fb797f6dd19dcf31` | `5e72bea0cd3db227f51ac5d5c9c2399f9e885f3047d063e40c67be203f4f4695` |
| `placement_results` | 6 | `id` | `a97228ad38eae5d4707892683fd34d213d32e1485dda01f3aab98026ed5d7392` | `a11eab455951d48923d12fc79f269bc8d0ed90edaa180e2a9141a6a817e08366` |
| `push_subscriptions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `question_bank_meta` | 0 | `questionId` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `question_options` | 97 | `id` | `874d9ab981026b0a658b07f95a227e2ae15690c5f56a0e387a89a44d4ea2e004` | `f0f31c465d0b287a051859b20d85ac983dd40cb55775723cdfe417d2df53c5b0` |
| `question_versions` | 1 | `id` | `b5e2df0339d56197c6feaf928a3920e1bfcfd312264bd22d46d42776a9cad534` | `bf04f942a4ad4b8acf860f23af6cfd3f748c7fa7129ff3ed050dc6f5ae52258a` |
| `questions` | 57 | `id` | `b2e3bf5ee017afaf04757c9fb5cc41fb86d972a5b045df5a563c17c39c2d28da` | `e0a60506f2cecb5851dd17b5503f047ffe5c6a899e7793b73d637bfa16c231cd` |
| `recurrence_rules` | 1 | `id` | `cc180d8a239cb5b25dd94f56481e4962c2680768c64e4075ecc3fd28730ae103` | `691945e4623917faf9fa4a975d16be735a9941c6d84be3abcc1b1a5891ce1549` |
| `requirement_overrides` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `review_schedules` | 1 | `id` | `21036561605185ea06f89ae456bd86dac535f77f791b85539160ae98ef317bfa` | `e0570eefa58ad5a6aa13e866622ba28b1627abb3ce6b4fa6e1432b5174c30e1d` |
| `role_permissions` | 161 | `roleId,permissionId` | `a95e9d2d4942622cf3b0d33c4becb037a410e7297996ccf8ab61169889a762b7` | `a95e9d2d4942622cf3b0d33c4becb037a410e7297996ccf8ab61169889a762b7` |
| `roles` | 8 | `id` | `49fb2c30817ac8377b7450cdf6efa251a52992b759e34bf712ab80e60fa479b5` | `da1314c122812a2bdf1f481d0b7a9aee374ef3842c080bf382cb56cbdb85beae` |
| `rubric_versions` | 6 | `id` | `0e5e4f4494b49c959aacd6d7f60446ff181788a283f334a6d63f1aace31b6555` | `0616916a0972cf4e2e10a1df8ebdf1a93d6f3d75c74b5152914667854041c656` |
| `rubrics` | 6 | `id` | `fc26bcfb0b9d403d32b9587878e9a2d44c49e023290511274703c668dc65da73` | `982328f5785f802b4eac1f64f60553986130577440f5be194c8477fa36b1c0ff` |
| `scheduled_notices` | 47 | `id` | `9cf7165789aa0d4e0ef56328cc6d4145ca53673412b189492c6917f312df4656` | `b333f3548e028ec15cb22740b504bd636303c6b77fdd343f2eecac58a4d259ed` |
| `skill_mappings` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `skills` | 19 | `id` | `7430c66f8ac88b98d926711466a2285ad5e368774645a65c6f542518d1e1f549` | `bc9bdeef9baa4fa952a567184891469ec87d08f79ef5b07c68abad652c130ec4` |
| `speaking_assignments` | 3 | `id` | `d4b3ddcf1c916d9d41e301b5ed3a6f08d2afdc5e04ed42ebe7a969eea538eabb` | `87c9b96ae66fccef48f08c1038b416d9611d804d178f74659b6599bf73551098` |
| `speaking_submissions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `speech_attempts` | 3 | `id` | `edd5eae63fa839505f76b3703b5a3cd6a57207664106b91e1709f83e25851c00` | `d208c7852f03f783fc28de1a10c9ba833f989d83108f166860e41bcb7d973997` |
| `speech_recognition_requests` | 12 | `id` | `ab69b297577f5e795635de6aceeb5451e2baf2cbe0986f0c7bd01f94a9f0cd25` | `355365c66a429b89f7a808da2d1f7617ed57153670c64675e242b67abf6dc452` |
| `streak_freezes` | 1 | `id` | `ed1e0b14d95beceef5b21d2e159e9033fe983906e948bc1f13a03e8c89dcd6cd` | `6b3fb65ed8118853ee617299355455b8416849676fd27eaddec48075330cb488` |
| `student_badges` | 3 | `id` | `a77c650f530ebff93c1dd17b35f92b1ef94e45780d5be1d73fd84b1317a8d7fc` | `c71573b3e587496cb2b505a2f32ffcdbc3fc0427813eaeb79096ce05cadeff54` |
| `student_course_assignments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `student_knowledge_states` | 1 | `id` | `150974cf9cda1518ad57c54fdd6ccc6443a76e03f9c9bc11f46558dd26578e0d` | `49893fb905a9449f8d4b936f011701232e839606757539e4ab79d8f481f7af04` |
| `student_learning_preferences` | 1 | `studentId` | `225b2e91cac53fc2d6f2f3dd9c55d945bf3597f8f0ab4b2ccd8e5204635d2ded` | `e8a04429429aa807c3471f5df685b818376b72fd257713961f1a07e888c0df0a` |
| `student_learning_profiles` | 77 | `studentId` | `9a0c3bca4284692ff29f6e157f011b97e44d6c5ad552f375b2cce3040dc48bdd` | `b6340701e1425031bcf0099d01db6ddbc257d889fb34a23bc08cbb15bf93d327` |
| `student_lesson_progress` | 5 | `id` | `cde08f065cfbb88a5e18eaa3e1798bd4d97db05b685e76c285312b9544a0bef5` | `c02cd72e7cb885c4eb68144176bb85d8709e5c6d7e9d1e3b88df51caa9c5d15e` |
| `student_milestones` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `student_skill_states` | 7 | `id` | `0ee8b495f803661b951e8505f76ce16d365c31e6493745c7b29ec5ab6efbd37d` | `398ed24846b15b01135a1672f34f6ee6b37d4945a61654504ca066ff9cb53e4b` |
| `student_voice_preferences` | 0 | `studentId` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `support_access_sessions` | 12 | `id` | `17511b6d58f8ea7d6443557c45eb7ad79ab1fb264f541253f6eec0b2600dc690` | `f91b8a944f955ed6a80923cef75e7f396b2411768dd0354a8b859a5aabd56391` |
| `teacher_approvals` | 2 | `id` | `7c152554e377beb02e8fd636c88756ed16ae958fbcd1a869d7a699eb55067b8b` | `59d78038332ab3492d505fed30bbfdc1c0a31466fc090dfb97d9ea5f892a5bc2` |
| `teacher_group_assignments` | 2 | `id` | `de870fec2fb7fbf3b336326e0344ffe9669951e58877d82da4499d11653198c2` | `90e98ff288bbefc93041533cdfbdc7f3928f25ee3a0101dd1b9ce773d258fc1f` |
| `teacher_learning_overrides` | 3 | `id` | `d4c1892ea15071b67cad885f820bf5ee197db6b89b694bd2d6666efc33024998` | `485d1a49c690f26c72e4b1943ef0dd570d4e64c79ce79d62ede16f102cdd2264` |
| `teacher_notes` | 7 | `id` | `ff3fcdbfe42dee2b024f8543bd072fb9bbd26875e6aa02ff66af5d193f264c02` | `2e563fdf61a38b11fbee7d0fc6137a7b719ce6c60de25be73c42912079c7b450` |
| `teacher_student_assignments` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `teaching_plans` | 8 | `id` | `234e0d74fd63f093696433bfaf3bba13eadd7f7a8e6688a4fea98a0a92bf66aa` | `fc79cd1a4f707490283b6f8b5841a5535a5b9e7ad3bb35f3ea0438d0e56674a2` |
| `teams` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `temporary_permissions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `transcripts` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `tts_requests` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `units` | 1 | `id` | `59ced479ee2606355f218e91135549ae1255425055b22323638b8d6cc99ff46f` | `eb1c2576784892b408268c4bb934260185b61f4f8372b5b3573ea5695f6f08fc` |
| `user_departments` | 0 | `userId,departmentId` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `user_groups` | 11 | `userId,groupId` | `bec7c727ceb52a587847b0b8817a38c9834cb086a7d8580098ee926b6c2bff90` | `4916905487d22c6e6bc20b47f20695e1e9340686c7e84a0e91649aa81ad4c7ca` |
| `user_invitations` | 23 | `id` | `d572c3baa277bd69ad14f96f4922729993112f092590c462f26a5a60ce47a055` | `9503818c51244544b2150330c53233d8a8b8dc8af23549e7b534ff7e14389592` |
| `user_organizations` | 87 | `userId,organizationId` | `1b90d59082bdac67370e470a845f399abb8a082277b595669fddc111d6fec746` | `bfb9812a57e8093fa985bb059a65423c201e2cdf722c016ac4455b9d30311063` |
| `user_profiles` | 0 | `userId` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `user_roles` | 6 | `id` | `f6640f39ecb4dc7ad0bfb47ec644f0b09c1d6869e5bf7f6f2e6781774da7c096` | `b446668f96613b260936798d037e27caa7141f3758aee0637e16cda90254a9bb` |
| `user_sessions` | 165 | `id` | `e6bd235cfbee027bbd58a1c5981fa9bf166b267f07b5d6c20d42b28ba7d73a9f` | `790210919ab91a6415568c39fab74837f313255ce91bbed354035b478d6ebbb2` |
| `users` | 87 | `id` | `56df0582ab8dbb851f3da5d19c2d1b9e1c28bb8d715b4797fc46db823b26c522` | `b38d892f52240f010b85066ac2f845e96132119bbe6021f4e58477a3a4473a7c` |
| `vocabulary` | 118 | `id` | `63aa9d4726baaf320ac942791dfe995414f7467729dddf65997739257f4f7ea0` | `1081cfae133f3ef989e4e1d25e46cbd1874cabf24557b22a9b342cc286ca90cb` |
| `vocabulary_review` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `voice_consents` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `voice_messages` | 6 | `id` | `ced571c73c8b83bd99d8b6c4a43c0445336be4348ed591b19648a69e912f0172` | `6d1371378e4e142ed69bb45c21d66eaed2d6c15c7bf030469904bb4921899d11` |
| `voice_sessions` | 6 | `id` | `d18f7f765d65fa435fdc5df469b5114ff07962e809b2ef6c1028d03fbd3c5dec` | `e223dfd5faadca09298c1ec83078cdb54b3ab3e1e2e8a36b3ae254d78ffd76ba` |
| `voice_settings` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `webhook_deliveries` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `webhook_inbound_receipts` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `webhook_subscriptions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `weekly_learning_plans` | 2 | `id` | `82c609c49c47ff1a1c2c099c85b0d1f4ce332eafc358158f653c255eecfe5c10` | `eb3dbf1a82e4d7dedccc9c4edcdc21a2c5b0164914c90bdbfd42e881910da039` |
| `workflow_approvals` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `workflow_events` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `workflow_idempotency_records` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `workflow_run_steps` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `workflow_runs` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `workflow_versions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `workflows` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `writing_submissions` | 0 | `id` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `xp_transactions` | 23 | `id` | `d14d8dee9ac52447baffe0555c17cd0c4964f6b8b872d217b77df818cd160ba4` | `8c71949e7e7ed66d1cda854b9602fe448a054d28249b29082c7c4d40fadcc75d` |
