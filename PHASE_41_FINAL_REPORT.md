# PHASE 41 — Final Report
## Durable Node.js runtime & reproducible release verification

**Date:** 2026-10-25
**Preceding state:** Phase 40 `PASS` (supported-runtime release verification on Node 22.23.3, provisioned ad hoc into `/tmp`)
**Scope:** make the supported-runtime workflow reproducible. No staging provisioned, nothing deployed, no migration run.

---

## 1. Verdict

# `PHASE 41 PARTIAL`

**A reproducible supported-runtime setup is demonstrated and every required release check passes under it.** The bootstrap is idempotent, checksum-verified, and fails safely. That part is complete and evidenced.

**Durability is not achieved, and is not claimed.** The Phase 41 rules say plainly: *"If persistence cannot be demonstrated, do not claim it."* It cannot be demonstrated here, for a structural reason documented in §3 — and for the same reason this is `PARTIAL`, not `PASS`.

| Objective | Status |
|---|---|
| Reproducible supported-runtime setup | **PASS** — one idempotent, checksum-verified command |
| All release checks under the supported runtime | **PASS** — Node v22.23.3 / npm 10.8.2 |
| Durable runtime across sessions | **NOT ACHIEVED** — no safe location exists (§3) |
| Constrained-memory handling | **DOCUMENTED, NOT SOLVED** — swap is a workaround (§6) |
| CI automation | **NOT ADDED** — no Git repository, no provider (§5) |
| Organizational staging readiness | **BLOCKED** — unchanged, Phase 37 still blocked |

**This is not a Phase 37 pass**, not staging readiness, and not a deployment authorization.

---

## 2. Runtime installation mechanism

`npm run runtime:setup` → `scripts/runtime/setup-node.mjs`

| Property | Implementation |
|---|---|
| Version source | **`.nvmrc`** — the script holds no copy of the version number |
| npm source | **`package.json` `packageManager`** (`npm@10.8.2`), pinned via Corepack |
| Archive origin | `https://nodejs.org/dist/v<version>/` over HTTPS, **redirects refused** |
| Integrity | SHA-256 compared with the vendor-published `SHASUMS256.txt` **before extraction**; mismatch aborts and leaves nothing |
| Install location | `$HOME/.local/share/lms-runtime` (override: `LMS_NODE_ROOT`); user-writable, **no sudo**, never a system path |
| Idempotence | A verified installation is **reused**, not re-downloaded (`Reusing verified installation`) |
| Cleanup | Archive, checksum file and staging dir removed on **every** exit path, including failure |
| Activation | Writes `env.sh`; the script never mutates the caller's shell |

### Observed versions

| | Value | Verification |
|---|---|---|
| Node.js | **v22.23.3** | matches `.nvmrc` exactly |
| npm | **10.8.2** | matches `packageManager` exactly |
| Engine range | `>=22.13.0 <23.0.0` | satisfied (22.23.3) |
| Sandbox default (unchanged, unsupported) | v20.20.2 | `/usr/bin/node` — deliberately untouched |

### Provenance

Archive `node-v22.23.3-linux-x64.tar.xz`, 31,001,304 bytes. Published and computed SHA-256 both `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de` — **MATCH**, printed by the script at runtime.

**Checksum verification is not signature verification.** The SHA-256 is fetched over the same HTTPS channel as the archive. It detects a corrupt or truncated transfer; it does **not** defend against a compromised distribution origin, which would require a GPG check against the Node.js release keys. The script states this at runtime rather than implying more assurance than it provides.

---

## 3. Persistence — why it cannot be demonstrated

This is the core finding of the phase, and the reason for `PARTIAL`.

| Candidate location | Snapshot-tracked? | Assessment |
|---|---|---|
| `$HOME/.local/share/lms-runtime` **(chosen)** | **No** — `.local` is excluded from snapshots | Survives within the sandbox instance; **not** guaranteed across sessions. Zero risk to repository data. |
| Any normal path under the repo (e.g. `~/.node`) | **Yes** | Would add **199 MB / 4,750 files** to a tracked footprint already at **83 MB** against a **~128 MB best-effort snapshot cap** — more than doubling it and risking eviction of real repository files. **Rejected as unsafe.** |
| `/tmp` | No | Not durable; never the only copy. The script does not default here. |

**The durable artifact is the script, not the binary.** Both options that would persist the *binary* are unacceptable — one risks the user's data, the other doesn't persist. So the honest outcome is: reproduce in one command, and document that re-running it is expected rather than exceptional.

`PHASE_41` therefore does not claim a durable runtime. `B12` (carried from Phase 39/40) remains **OPEN**.

---

## 4. Installation and verification commands actually executed

All release checks ran under **Node v22.23.3 / npm 10.8.2**, activated from the bootstrap's own `env.sh`.

| # | Command | Exit | Observed result |
|---|---|---|---|
| 1 | `node scripts/runtime/setup-node.mjs --check` (no install present) | **1** | `BLOCKED: no verified installation … Next step: Run without --check` — fails safely |
| 2 | `node scripts/runtime/setup-node.mjs` (fresh provision) | **0** | downloaded 31,001,304 B → checksum MATCH → extracted → npm pinned to 10.8.2 |
| 3 | `node scripts/runtime/setup-node.mjs` (second run) | **0** | `Reusing verified installation (node v22.23.3)` — idempotent, no re-download |
| 4 | `npm run runtime:check` | **0** | node v22.23.3, npm 10.8.2 |
| 5 | `npm ls --depth=0` | **0** | tree accepted; 2 extraneous optional WASM artifacts (§7) |
| 6 | `npm run release:verify` (first, post-bootstrap) | **0** | typecheck → full test chain → build, 102.1 s |
| 7 | `npm run release:verify` (final, after the script fix) | **0** | typecheck → full test chain → build, 94.0 s |
| 8 | `npm run staging:ready` | **2** | 18 checks: 0 ready / **7 blocked** / 11 skipped — unchanged |

**Covered inside `release:verify` rather than re-run separately** (per the phase's instruction to avoid duplicate builds and unnecessary repetition): `npm run typecheck` (exit 0), `npm test` (exit 0 — includes `test:staging-gate` **27/0** and `test:release-contracts` **13/0**), `npm run build:safe` (exit 0, `✓ Compiled successfully`). Each executed; none is reported from inference.

**`npm ci` was deliberately NOT re-run.** Its result from Phase 40 stands, and the current tree was verified lockfile-faithful with `npm ls --depth=0` (exit 0) — exactly what the phase asks for in this situation.

---

## 5. CI decision

**No CI workflow was added.** Evidence:

| Check | Finding |
|---|---|
| Git repository | **None** — no `.git`, not a VCS working tree |
| CI provider config | **None** — no `.github/`, no provider file |
| Deployment manifest | **None** |

With no repository and no provider, any workflow committed would be inert — it could not execute and could not be verified. Fabricating one would be the "green result that means nothing" this series exists to prevent. Authorizing `git init` or creating an external repository is outside this phase.

**Provider-neutral sequence** (suitable for any runner):

```bash
npm run runtime:check     # fail fast if the runtime is wrong
npm ci                    # lockfile-faithful install
npm run release:verify    # typecheck → full test chain → memory-safe build
```

**Minimum runner requirements** (documented in `docs/PHASE41_RUNTIME_SETUP.md` §5): Node 22.13–22.x (22.23.3 preferred); npm 10.8.2; **≥ 3.5 GB RAM+swap**; ≥ 2 GB free disk; HTTPS to `nodejs.org` and the npm registry at install time only; **no secrets**; **no database**.

---

## 6. Memory and swap findings

| Item | Value |
|---|---|
| RAM | 1,982 MB |
| Swap | **2,047 MB — `/swapfile`, 2,147,483,648 bytes, `root:root`, mode `600`, still active** |
| Origin | Created in **Phase 40** to work around OOM during `npm ci` |
| Phase 41 action | **None.** Left exactly as found; not resized, not removed. The phase forbids altering system swap without confirmed authorization, and none was given. |
| Utilization | ~440–520 MB currently in use |
| Remediation for others | `sudo swapoff /swapfile && sudo rm /swapfile` — **not performed here** |

**Requirement, stated plainly:** `npm ci` on this project (764 MB tree) needs roughly **3.5 GB RAM+swap**. Without swap it was OOM-killed at ~10 s, three times, at ~797 MB RSS. Swap is a **workaround for a constrained sandbox, not a recommendation** — an adequately provisioned runner (4 GB+ RAM) is the correct fix. `npm run runtime:setup` warns whenever RAM+swap totals under 3.5 GB.

`runtime:setup` itself uses ~31 MB of download and needs no swap; only dependency installation is affected.

---

## 7. Files created or modified

| File | Change | Justification |
|---|---|---|
| `scripts/runtime/setup-node.mjs` | **new** (~250 lines) | The reproducible bootstrap: version from `.nvmrc`, checksum-verified download, idempotent, fails safely |
| `docs/PHASE41_RUNTIME_SETUP.md` | **new** | Usage, persistence limits, memory requirement, provider-neutral release sequence and runner spec |
| `package.json` | **modified** | Added `runtime:setup` and `runtime:check`. No existing script altered; `release:verify` unchanged |
| `PHASE_41_FINAL_REPORT.md` | **new** | This report |

**Not changed:** application source (`src/**` — **0 files**), Prisma schema, both migration trees, `MANIFEST.sha256`, `.nvmrc`, `engines`, `packageManager`, `package-lock.json`, and all historical phase reports.

### A defect in my own script, found and fixed

The first version of `setup-node.mjs` used `fetch` with **no timeout**. During a negative test the process hung indefinitely instead of failing safely — the opposite of the phase's requirement that it "fail safely with actionable instructions." Fixed by adding a bounded `AbortSignal.timeout(120_000)` and an explicit `mkdir` guard, both mapping to actionable `BLOCKED` messages.

The stray process was identified and killed; two valid negative tests now confirm fast, clean failure:
- install root is an existing file → `BLOCKED: … cannot be created (EEXIST)` + next step, exit 1
- `--check` with no install → `BLOCKED: no verified installation …` + next step, exit 1

No partial artifacts remain after either failure.

---

## 8. Integrity results

| Check | Result |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` — **identical** |
| `package-lock.json` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` — **unchanged** |
| SQLite migrations | **4** — unchanged |
| PostgreSQL migrations | **5** — unchanged |
| `MANIFEST.sha256` | **4/4 verified** — unchanged, no update required |
| `src/` files changed this phase | **0** (verified against a mid-session timestamp reference) |
| Secrets in new files | **0 matches** (credential URLs, private keys, AWS keys, hardcoded secrets) |
| Runtime binaries/archives in the repo | **none** — install lives in `.local`, outside the tracked footprint |
| Tracked footprint | **83 MB** — unchanged by this phase |

### Correction to earlier reports — disclosed

Phase 39 and Phase 40 each stated *"0 src files modified today"* based on `find … -newermt "today"`. **That predicate silently matches nothing in this environment** (`-newermt "2026-10-25"` works; `-newermt "today"` does not). Those two claims were therefore **unsupported by the method used**, even though the underlying fact holds — verified this phase by a working comparison against a known timestamp, which shows **0** `src/` files changed after the last Phase 36 edit. Historical reports are left unmodified; this is the superseding note.

---

## 9. External activity confirmation

| Activity | Occurred? | Detail |
|---|---|---|
| External network | **YES — disclosed** | Two downloads from `nodejs.org` (runtime archive + checksum file) during provisioning. **No other external host contacted.** `npm ci` was not re-run. |
| Production access | **NO** | None referenced |
| Staging database contacted | **NO** | No organizational database exists; local PostgreSQL cluster stayed **down** |
| Migration / reset / backup / restore | **NO** | Not executed |
| Storage upload | **NO** | Not executed |
| Deployment / publication | **NO** | Not executed |
| System swap modified | **NO** | Found active from Phase 40; reported, left untouched |
| Git repository initialized | **NO** | Not authorized, not done |
| Application source changed | **NO** | 0 files under `src/` |

---

## 10. Remaining blockers

| # | Blocker | Owner | Next action |
|---|---|---|---|
| **B12** | **No durable Node 22 runtime.** It lives in `.local`, which is not snapshotted; the sandbox default remains 20.20.2 | Environment / CI owner | Provide a persistent runner image with Node 22.23.3, or accept re-running `npm run runtime:setup` each session |
| **B13** | **`npm ci` needs ~3.5 GB RAM+swap**; the box has 1,982 MB and relies on a swap file created in Phase 40 | Environment owner | Provision ≥ 4 GB RAM; treat swap as the workaround it is |
| **B14** | Node archive authenticity rests on HTTPS + published SHA-256, **not** GPG-verified release signatures | Security | Optionally add GPG verification against the Node.js release keys |
| **B15** | **No Git repository and no CI provider** — release checks are not enforced automatically anywhere | Organization | Authorize repository creation and a CI provider; then add the one-line `npm run release:verify` step |

### Organizational staging — unchanged, still blocking Phase 37

| # | Blocker | Owner |
|---|---|---|
| B1 | No non-production PostgreSQL endpoint | Organization / platform |
| B2 | No written authorization for that database | Staging DB owner |
| B3 | No organizational CA certificate | Organization / PKI |
| B4 | No least-privilege application role | DBA |
| B5 | No libpq tooling connection | DBA |
| B6 | Storage decision unresolved (15 `PENDING` fields) | Organization |
| B7 | No persistent volume / file-snapshot plan | Organization / ops |
| B8 | No approved deployment target | Organization / ops |
| B9 | Probe wiring unverified in any orchestrator | Organization / ops |
| B10 | Timeout / connection-limit values unset | DBA |
| B11 | No separate disposable restore target | Organization / platform |

**Phase 37 remains `BLOCKED`.** The staging gate still exits **2** with 7 blocked / 11 skipped — identical to Phases 38–40. No environment variable was fabricated to change that.

---

### Superseding findings

- Phase 40's `PASS` stands for its own scope (release verification on a supported runtime). Phase 41 supersedes its **durability** implication: the Phase 40 runtime lived in `/tmp`; Phase 41 provides a reproducible, checksum-verified replacement and demonstrates that neither `/tmp` nor a snapshotted location is an acceptable home for it.
- The `-newermt "today"` defect invalidates the *method* behind the "0 files modified" claims in Phases 39 and 40 (see §8). The facts remain true but are now supported by a working check.

### Standing constraints honoured

No production access. No deployment. No migration, reset, backup, restore, or storage upload. `dev.db` byte-identical; both migration histories unchanged; manifest 4/4; lockfile unchanged. No credentials in any file, log, or script. No `--force`, no engine bypass, no untrusted mirror. System swap neither created nor altered this phase. Historical reports not rewritten. Phase 42 was not started.
