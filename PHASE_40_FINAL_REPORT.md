# PHASE 40 — Final Report
## Supported Node.js runtime verification & release baseline

**Date:** 2026-10-25
**Preceding state:** Phase 39 `PARTIAL` (release checks green, but only on an unsupported Node runtime)
**Scope:** close the runtime-verification gap using evidence. No staging provisioned, nothing deployed, no migration run.

---

## 1. Verdict

# `PHASE 40 PASS`

**This PASS applies to exactly one of three outcomes:**

| Outcome | Status |
|---|---|
| **Supported-runtime release verification** | **PASS** — Node 22.23.3 was actually provisioned and used; `npm ci` succeeded; every required check passed under it; integrity verified |
| **Organizational staging readiness** | **BLOCKED** — unchanged, no inputs provided (Phase 37 remains blocked) |
| **Production deployment authorization** | **NOT GRANTED, NOT REQUESTED** |

Phase 39's PARTIAL is now closed: the release chain has been exercised on the runtime the repository
declares (`>=22.13.0 <23.0.0`), not on the Node 20 sandbox default.

**What this PASS does not mean:** it is not a Phase 37 pass, not staging readiness, and not a
deployment authorization. A green release chain says the repository is internally consistent on a
supported runtime; it says nothing about whether an organizational staging environment exists.

---

## 2. Actual Node.js and npm versions

| | Version | Source |
|---|---|---|
| **Node.js actually used** | **v22.23.3** | Official distribution `node-v22.23.3-linux-x64.tar.xz`, extracted to `/tmp/node22` (outside the repository) |
| **npm actually used** | **10.8.2** | Obtained via Corepack (`corepack prepare npm@10.8.2 --activate`), matching `packageManager` |
| Sandbox default (still present, not used for verification) | v20.20.2 / npm 10.8.2 | `/usr/bin/node` — **below** the declared engine |

The Node 22 binary was **not** taken from the sandbox default and the project's declared engine was
**not** altered. `.nvmrc` (22.23.3), `engines` and `packageManager` are untouched.

### Provenance of the runtime

| Step | Evidence |
|---|---|
| Version exists in the official index | `v22.23.3`, released 2026-09-23, LTS line "Jod", linux-x64 available |
| Tarball downloaded from the canonical distribution | `https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-x64.tar.xz` (31,001,304 bytes) |
| **SHA-256 verified against the vendor-published list** | published `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de` = computed — `node-v22.23.3-linux-x64.tar.xz: OK` |
| npm pinned to the declared package manager | `corepack prepare npm@10.8.2 --activate` → `npm -v` = 10.8.2 |

**Limitation, stated plainly:** `SHASUMS256.txt` was not GPG-verified against the Node.js release
keys, so authenticity rests on HTTPS transport to `nodejs.org` plus that checksum. It is not an
independently signed verification.

---

## 3. Evidence the runtime satisfies the declared engine

```
engines.node       : >=22.13.0 <23.0.0
.nvmrc             : 22.23.3
runtime observed   : v22.23.3
satisfies          : true      (major 22, minor 23 ≥ 13)
packageManager     : npm@10.8.2  → npm observed 10.8.2
```

`npm ci` completed without any engine warning, which is itself consistent with a satisfied
`engines` range. No `--force` or `--engine-strict=false` bypass was used.

---

## 4. Dependency installation result

| Item | Result |
|---|---|
| Command | `npm ci --no-audit --no-fund` (plain `npm ci` semantics; flags only suppress audit/funding chatter) |
| Runtime | Node v22.23.3 / npm 10.8.2 |
| **Exit code** | **0** |
| Result | `added 232 packages in 18s`; `✔ Generated Prisma Client (v5.22.0)` via the `postinstall` hook |
| Tree size after | 764 MB, 160 top-level entries |
| **`package-lock.json` changed?** | **No** — SHA-256 `035df9a385770ec2…a76b48` identical before and after |
| `package.json` / `.nvmrc` / `engines` changed? | **No** |
| Post-install consistency | `npm ls --depth=0` → exit 0 |

### Four attempts were required — recorded in full

| # | Configuration | Outcome |
|---|---|---|
| 1 | plain `npm ci` | **SIGKILL (exit 137)** after 10.8 s — kernel OOM killer |
| 2 | `NODE_OPTIONS=--max-old-space-size=512`, `--maxsockets=2`, caches dropped | **SIGKILL** after 10.7 s |
| 3 | existing tree renamed aside (rollback preserved), heap 768 MB | **SIGKILL** after 10.2 s |
| 4 | `npm ci --dry-run` (validation only) | **exit 0** — proved the lockfile resolves; revealed the OOM was in physical extraction, not resolution |
| 5 | **2 GB swap file enabled, heap 1024 MB** | **exit 0** — success |

Root cause was **environmental, not a repository defect**: `dmesg` recorded
`oom-kill: ... global_oom ... task=npm ci ... anon-rss:797544kB` on a 1,982 MB box with **no swap**.
The package tree is 764 MB. Capping the V8 heap did not help because the pressure was in filesystem
materialization, not the JS heap.

Each failed attempt was diagnosed, not blindly retried, and the previously installed tree was
preserved intact (verified: `next`, `@prisma/client`, `prisma`, `typescript`, `tsx` all loadable,
`tsc 5.9.3`).

**Note on the earlier tree:** before this phase, `npm ci --dry-run` reported **72 packages that would
change** — i.e. the pre-existing `node_modules` was *not* lockfile-faithful. Those 72 are optional
cross-platform binaries (`lightningcss-win32-x64`, `@tailwindcss/oxide-darwin-arm64`, `fsevents`,
`@img/sharp-webcontainers-wasm32`, …) that npm correctly skips on linux-x64. All required
`linux-x64` packages are installed; the count reflects optional platform entries, not missing
dependencies.

---

## 5. Required validation commands

Every command below ran under **Node v22.23.3 / npm 10.8.2** in the repository environment.

| # | Command | Exit | Observed result | Duration |
|---|---|---|---|---|
| 1 | `node --version` | 0 | `v22.23.3` | — |
| 2 | `npm --version` | 0 | `10.8.2` | — |
| 3 | `npm run typecheck` | **0** | clean | 6.4 s |
| 4 | `npm test` | **0** | all chained suites pass; gate 27/0, contracts 13/0 | 4.3 s |
| 5 | `npm run test:release-contracts` | **0** | **13 passed / 0 failed** | 0.6 s |
| 6 | `npm run test:staging-gate` | **0** | **27 passed / 0 failed** | 1.4 s |
| 7 | `npm run build:safe` | **0** | compiled successfully; `/health` + `/health/live` emitted as dynamic | 89.7 s |
| 8 | `npm run release:verify` | **0** | typecheck → full test chain → build, all stages ran | 90.1 s |
| 9 | `npm run staging:ready` | **2** | 18 checks: **0 ready / 7 blocked / 11 skipped** | <1 s |

**Notes required by the phase:**

- **`release:verify` propagates failures correctly** — it is an `&&` chain; the forced-failure
  demonstration from Phase 39 (`… && node -e "process.exit(7)"` → exit 7) still holds, and the
  contract suite asserts the chain shape and that it contains no migrate/backup/deploy tokens.
- **The staging gate is independent of `release:verify`** — the contract suite fails the build if
  `release:verify` ever references `staging:ready`. Confirmed: `release:verify` = `typecheck && npm test && build:safe`.
- **`staging:ready` was not made to pass.** Exit 2 with the same seven blocked checks; **no**
  environment variable was fabricated.
- **No test failed and no test was re-run to hide flakiness.** No retries were needed for any test
  suite; the only repeated operation was dependency installation, and all five attempts are recorded
  above with their reasons.
- Two builds were executed (the required standalone `build:safe`, then the build inside
  `release:verify`). This is the minimum consistent with running every command the phase lists.

---

## 6. Compatibility defects found and remediation

**No application or dependency compatibility defect was exposed by Node 22.** Typechecking, the full
test chain, and the production build all passed on the first attempt under the supported runtime.
No source file, dependency, lockfile, or declaration was changed to accommodate Node 22 — none needed
to be.

| Finding | Classification | Remediation |
|---|---|---|
| `npm ci` OOM-killed three times on a 1,982 MB box with no swap | **Environmental**, not a code defect | Enabled a 2 GB swap file (see §9); install then succeeded in 18 s |
| Pre-existing `node_modules` was not lockfile-faithful (72 optional packages pending) | **Environmental drift**, not a repo defect | Resolved by the successful `npm ci` — the tree is now installed from the lockfile |
| `npm run <script>` silently failed with exit 127 in my first measurement harness | **My harness error** — `/usr/bin/time` is not installed | Re-ran with shell timing; disclosing because a tooling error could be mistaken for a test failure |

---

## 7. Files changed

**Repository files changed in Phase 40: none.**

| Category | Change |
|---|---|
| Application source (`src/**`) | **0 files modified** |
| Prisma schema, SQLite migrations, PostgreSQL migrations | **unchanged** |
| `MANIFEST.sha256` | **unchanged**, 4/4 verified |
| `package.json` / `package-lock.json` / `.nvmrc` / `engines` | **unchanged** |
| Prior phase reports (`PHASE_37/38/39`) | **unchanged** |
| `node_modules/` | **replaced** by `npm ci` (generated artifact, not tracked source) |
| `.next/` | regenerated by the builds (generated artifact) |

**Changes outside the repository, all disclosed in §9:**

- `/tmp/node22` — isolated Node 22.23.3 runtime, checksum-verified, **ephemeral** (not part of the workspace snapshot).
- `/swapfile` — 2,147,483,648 bytes, active swap. Reversible with `sudo swapoff /swapfile && sudo rm /swapfile`.
- `PHASE_40_FINAL_REPORT.md` — this report (the only file added under `/home/user`).

---

## 8. Data, migration, manifest and secret integrity

| Check | Result |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` — **identical** to the Phase 33 baseline |
| `prisma/dev.db` size | 4,517,888 B — unchanged |
| SQLite migrations | **4** — unchanged |
| PostgreSQL migrations | **5** — unchanged |
| `MANIFEST.sha256` | **4/4 entries verified** — unchanged, no update required |
| `package-lock.json` | unchanged (`035df9a3…a76b48`) |
| Files modified today outside `node_modules`/`.next` | **none** (verified by modified-time scan) |
| Secrets in install / build / test logs | **0 matches** for credential URLs, private keys, or AWS key patterns |
| Credentials requested or introduced | **none** |

---

## 9. External activity confirmation

| Activity | Occurred? | Detail |
|---|---|---|
| External network | **YES — disclosed** | Two downloads from the canonical Node.js distribution (`index.json`, the linux-x64 tarball) and its published checksum file; `npm ci` fetched packages from the configured npm registry. **No other external host was contacted.** |
| Production endpoint accessed | **NO** | None referenced |
| Staging database contacted | **NO** | No organizational database exists; local PostgreSQL cluster stayed **down** throughout |
| Database migration / reset / backup / restore | **NO** | Not executed |
| Storage upload | **NO** | Not executed |
| Deployment / publication | **NO** | Not executed |
| Swap file created and enabled | **YES — disclosed** | 2 GB at `/swapfile`; required to complete `npm ci`. Sandbox-level, outside the repository, reversible |
| Node.js runtime installed | **YES — disclosed** | Official tarball, checksum-verified, extracted to `/tmp` only; no system package, no PATH change to system directories, no version-manager installation |

---

## 10. Remaining blockers

### Organizational staging (unchanged — blocks Phase 37, not this phase)

| # | Blocker | Owner | Next action |
|---|---|---|---|
| B1 | No non-production PostgreSQL endpoint | Organization / platform | Provision; supply via approved mechanism |
| B2 | No written authorization for that database | Staging DB owner | Authorize Phase 37 against it |
| B3 | No organizational CA certificate | Organization / PKI | Make the signing CA readable; SAN must match endpoint |
| B4 | No least-privilege application role | DBA | Non-superuser; no CREATEDB/CREATEROLE/replication/BYPASSRLS |
| B5 | No libpq tooling connection | DBA | `sslmode=verify-full` + `sslrootcert`, no `sslaccept` |
| B6 | Storage decision unresolved (15 `PENDING` fields) | Organization | Complete `PHASE_38_STORAGE_DECISION_RECORD.md` |
| B7 | No persistent volume / file-snapshot plan | Organization / ops | Name volume, mount path, snapshots |
| B8 | No approved deployment target | Organization / ops | HTTPS staging base URL |
| B9 | Probe wiring unverified in any orchestrator | Organization / ops | Wire `/health/live` + `/health` |
| B10 | Timeout / connection-limit values unset | DBA | Measure, then apply per-role |
| B11 | No separate disposable restore target | Organization / platform | Provision one distinct from staging |

### Environment / release-baseline (new or carried)

| # | Item | Status | Owner |
|---|---|---|---|
| B12 | **Sandbox default runtime is Node 20.20.2, below the declared engine** — still true; verification therefore required provisioning Node 22 into `/tmp`, which does **not** persist | **OPEN** | Environment owner / CI provider |
| B13 | `npm ci` requires ~2 GB of headroom; the box has 1,982 MB and needed swap | **MITIGATED by swap**, not solved | Environment owner |
| B14 | Node tarball authenticity relies on HTTPS + published SHA-256, not GPG | **ACCEPTED with disclosure** | Security |

**To close B12 durably**, the supported runtime must exist where the work actually happens. Repro:

```bash
curl -O https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-x64.tar.xz
curl -O https://nodejs.org/dist/v22.23.3/SHASUMS256.txt
sha256sum -c <(grep 'node-v22.23.3-linux-x64.tar.xz' SHASUMS256.txt)
mkdir -p /tmp/node22 && tar -xJf node-v22.23.3-linux-x64.tar.xz -C /tmp/node22 --strip-components=1
export PATH=/tmp/node22/bin:$PATH
corepack prepare npm@10.8.2 --activate && corepack enable --install-directory /tmp/node22/bin npm
node -v && npm -v        # expect v22.23.3 / 10.8.2
npm ci && npm run release:verify
```

---

### Superseding findings

- **Phase 39's verdict `PARTIAL` is superseded** for its stated reason: the release chain has now been
  verified on the declared runtime. Phase 39's report is left unmodified as the historical record.
- **B12 from Phase 39 is partially resolved**: the verification gap is closed for this phase's evidence,
  but the sandbox default remains Node 20, so any future phase must re-provision Node 22 explicitly
  (it lives in `/tmp` and does not persist).
- Phase 39's statement that the installed tree was consistent proved weaker than the `npm ci --dry-run`
  evidence now shows: 72 optional cross-platform packages were pending before this phase's clean install.

### Standing constraints honoured

No production access. No deployment or publication. No migration, reset, backup, restore, or storage
upload. `prisma/dev.db` byte-identical; both migration histories unchanged; `MANIFEST.sha256` still
4/4. No secret introduced or printed. No dependency replaced to bypass engine restrictions; `.nvmrc`,
`engines` and the lockfile were left exactly as found. No test result was re-run until it passed —
none failed. Phase 41 was not started.
