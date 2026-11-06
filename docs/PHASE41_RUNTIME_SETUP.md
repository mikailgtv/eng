# Supported Runtime Setup

**Project requirement:** Node.js `>=22.13.0 <23.0.0` (`package.json` `engines`), exact version `22.23.3` (`.nvmrc`), npm `10.8.2` (`packageManager`).

This document covers how to obtain that runtime reproducibly, and what this environment can and cannot guarantee about keeping it.

---

## 1. One command

```bash
npm run runtime:setup      # provision + verify
npm run runtime:check      # verify only; exits non-zero if the runtime is absent or wrong
```

Then activate it in the current shell:

```bash
. ~/.local/share/lms-runtime/node-v22.23.3-linux-x64/env.sh
node -v   # v22.23.3
npm -v    # 10.8.2
```

The script takes the version from **`.nvmrc`** and the npm version from **`packageManager`**. It does not carry its own copy of either number, so bumping the runtime means editing `.nvmrc` and nothing else.

---

## 2. What the bootstrap does

| Step | Behaviour |
|---|---|
| Version source | `.nvmrc` (exact `x.y.z` required; a range is rejected) |
| Download | `https://nodejs.org/dist/v<version>/node-v<version>-<platform>.tar.xz` — HTTPS, **redirects refused** so the host cannot silently change |
| Integrity | SHA-256 compared against the `SHASUMS256.txt` published in the **same versioned directory**, checked **before** extraction |
| Failure | A mismatch aborts and leaves nothing behind — no partial runtime, no staging directory, no archive |
| Extraction | `tar -xJf` into a `.staging-` directory, verified by running the staged `node --version`, then atomically renamed into place |
| npm pin | If the bundled npm differs from `packageManager`, Corepack prepares and activates the exact pinned version |
| Location | `$HOME/.local/share/lms-runtime` by default; override with `LMS_NODE_ROOT`. User-writable, no sudo, never a system path |
| Idempotence | A verified installation is reused (`Reusing verified installation`), never re-downloaded |
| Cleanup | Archive, checksum file and staging directory are removed on every exit path, including failure |

### Checksum verification is not signature verification

The SHA-256 is fetched over the same HTTPS channel as the archive. This reliably detects a **corrupt or truncated transfer**. It does **not** defend against a compromised distribution origin — that would require verifying the GPG signature against the Node.js release keys. The script states this at runtime rather than implying more assurance than it provides.

---

## 3. Persistence — stated honestly

**The runtime installation is not guaranteed to persist across sessions.**

| Location | Persists across sessions? | Notes |
|---|---|---|
| `~/.local/share/lms-runtime` (default) | **No** — not part of the project snapshot | Preferred: it cannot displace repository files from the snapshot budget |
| Inside the repository tree | Would persist, but **must not be used** — see below | A 199 MB / 4,750-file install would more than double the ~83 MB of tracked content against a ~128 MB snapshot cap, risking eviction of real repo files |
| `/tmp` | Not guaranteed | Never the only copy; the script does not default here |

**The durable artifact is the script, not the binary.** If a later session reports an unsupported Node.js version, re-run `npm run runtime:setup`. It is idempotent, so the cost of re-provisioning is a single ~31 MB download.

Do not commit Node.js binaries, downloaded archives, or generated runtime directories.

---

## 4. Memory requirement for `npm ci`

The dependency tree is ~764 MB installed. **`npm ci` on this project needs roughly 3.5 GB of RAM+swap available** to avoid the kernel OOM killer.

| Observation | Value |
|---|---|
| This sandbox | 1,983 MB RAM + 2,048 MB swap = 4,031 MB |
| Without swap | `npm ci` was SIGKILLed at ~10 s, three times, at ~797 MB RSS (`global_oom`) |
| With 2 GB swap | `npm ci` succeeded — 232 packages in 18 s |

`npm run runtime:setup` prints a warning when RAM+swap totals under 3.5 GB.

**Preferred resolution is an adequately provisioned runner (4 GB+ RAM), not swap.** Swap was a workaround for a constrained sandbox, not a recommendation.

---

## 5. Provider-neutral release verification

There is **no Git repository and no CI provider** in this workspace (verified: no `.git`, no `.github/`, no provider config). No provider-specific workflow is committed, because none could be executed or verified here.

Any runner — CI or a person — can run:

```bash
npm run runtime:check     # fail fast if the runtime is wrong
npm ci                    # lockfile-faithful install
npm run release:verify    # typecheck → full test chain → memory-safe build
```

**Minimum runner requirements:**

| Requirement | Value | Why |
|---|---|---|
| Node.js | `22.13.0`–`22.x`, exactly `22.23.3` preferred | `engines` + `.nvmrc` |
| npm | `10.8.2` | `packageManager` |
| RAM+swap | **≥ 3.5 GB** (4 GB RAM recommended) | `npm ci` on a 764 MB tree |
| Disk | ≥ 2 GB free | tree plus build output |
| Network | HTTPS to `nodejs.org` and the npm registry, at install time only | runtime + dependencies |
| Secrets | **none** | `release:verify` needs no credentials |
| Database | **none** | no suite connects to a database server |

---

## 6. What this does not do

- It does not change `engines`, `.nvmrc`, or `packageManager` to accommodate an unsupported default runtime.
- It does not use `--force`, bypass engine checks, or download from a mirror.
- It does not start a database, run migrations, or touch staging or production.
- It is not a staging readiness check — that is `npm run staging:ready`, a separate question with separate requirements.
