#!/usr/bin/env node
/**
 * Reproducible supported-runtime bootstrap (Phase 41).
 *
 * Provisions the Node.js version pinned by `.nvmrc` and the npm version pinned by
 * `packageManager`, verifying the downloaded archive against the checksum that the
 * Node.js project publishes alongside it.
 *
 * Design constraints, all deliberate:
 *   - The version comes from `.nvmrc`. There is exactly one source of truth; this script
 *     never carries its own copy of the version number.
 *   - The archive is fetched over HTTPS from the canonical distribution only. No mirror,
 *     no fallback host, no "skip verification" switch.
 *   - SHA-256 is checked BEFORE extraction. A mismatch aborts and leaves nothing behind.
 *   - Installs under a user-writable directory, never a system path, and never requires sudo.
 *   - Idempotent: a verified installation is reused, not re-downloaded.
 *   - Emits an `env.sh` you can source, rather than mutating the caller's shell.
 *
 * There are no credentials anywhere in this process, so there is nothing secret to leak.
 *
 * Usage:
 *   node scripts/runtime/setup-node.mjs             # install/reuse, then verify
 *   node scripts/runtime/setup-node.mjs --check     # verify an existing install only
 *   node scripts/runtime/setup-node.mjs --force     # reinstall even if present
 *
 * Environment:
 *   LMS_NODE_ROOT   install root (default: $HOME/.local/share/lms-runtime)
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const DIST_BASE = "https://nodejs.org/dist";

const argv = new Set(process.argv.slice(2));
const CHECK_ONLY = argv.has("--check");
const FORCE = argv.has("--force");

const say = (m) => process.stdout.write(`${m}\n`);
const fail = (m, hint) => {
  process.stderr.write(`\nBLOCKED: ${m}\n`);
  if (hint) process.stderr.write(`\nNext step:\n${hint}\n`);
  process.exit(1);
};

// ---------------------------------------------------------------- declared versions
function readDeclared() {
  const nvmrcPath = path.join(PROJECT_ROOT, ".nvmrc");
  if (!fs.existsSync(nvmrcPath)) fail(".nvmrc is missing; cannot determine the supported Node.js version.");
  const version = fs.readFileSync(nvmrcPath, "utf8").trim().replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`.nvmrc does not contain an exact version (got "${version}").`);

  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
  const pm = pkg.packageManager ?? "";
  const npmMatch = /^npm@(\d+\.\d+\.\d+)$/.exec(pm);
  if (!npmMatch) fail(`package.json packageManager must be an exact npm version (got "${pm}").`);

  const engine = pkg.engines?.node ?? "(not declared)";
  return { version, npmVersion: npmMatch[1], engine };
}

// ---------------------------------------------------------------- platform mapping
function platformTarget() {
  const arch = { x64: "x64", arm64: "arm64", arm: "armv7l" }[process.arch];
  const plat = { linux: "linux", darwin: "darwin" }[process.platform];
  if (!arch || !plat) {
    fail(
      `unsupported platform ${process.platform}/${process.arch}.`,
      "Install the version named in .nvmrc manually, then re-run with --check.",
    );
  }
  return `${plat}-${arch}`;
}

// ---------------------------------------------------------------- memory precondition
function memoryReport() {
  const mb = (kb) => Math.round(kb / 1024);
  if (process.platform !== "linux" || !fs.existsSync("/proc/meminfo")) return null;
  const info = fs.readFileSync("/proc/meminfo", "utf8");
  const get = (k) => Number(new RegExp(`^${k}:\\s+(\\d+) kB`, "m").exec(info)?.[1] ?? 0);
  const ram = mb(get("MemTotal"));
  const swap = mb(get("SwapTotal"));
  return { ram, swap, total: ram + swap };
}

// ---------------------------------------------------------------- verification helpers
function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function nodeVersionAt(binDir) {
  const r = spawnSync(path.join(binDir, "node"), ["--version"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim().replace(/^v/, "") : null;
}

function npmVersionAt(binDir) {
  const r = spawnSync(path.join(binDir, "npm"), ["--version"], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ""}` },
  });
  return r.status === 0 ? r.stdout.trim() : null;
}

function envFilePath(installDir) {
  return path.join(installDir, "env.sh");
}

function reportSuccess(installDir, declared) {
  const envFile = envFilePath(installDir);
  say(`  install root : ${installDir}`);
  say(`  node         : v${nodeVersionAt(path.join(installDir, "bin"))}`);
  say(`  npm          : ${npmVersionAt(path.join(installDir, "bin"))}`);
  say(`  declared     : node ${declared.version} (from .nvmrc), npm ${declared.npmVersion} (from packageManager)`);
  say(`  engine range : ${declared.engine}`);
  say("");
  say("  Activate in this shell:");
  say(`    . ${envFile}`);
  say("");
  say("  Persistence: this directory is NOT part of the project snapshot. If a later");
  say("  session reports an unsupported Node.js version, re-run this script — it is");
  say("  idempotent and reuses a verified installation when one is present.");
}

// ---------------------------------------------------------------- main
async function main() {
  const declared = readDeclared();
  const target = platformTarget();
  const root = process.env.LMS_NODE_ROOT || path.join(os.homedir(), ".local", "share", "lms-runtime");
  const dirName = `node-v${declared.version}-${target}`;
  const installDir = path.join(root, dirName);
  const binDir = path.join(installDir, "bin");

  say("\nSupported-runtime bootstrap");
  say(`  .nvmrc            : ${declared.version}`);
  say(`  packageManager    : npm@${declared.npmVersion}`);
  say(`  platform target   : ${target}`);
  say(`  install root      : ${root}`);
  say(`  source of archive : ${DIST_BASE} (HTTPS)`);
  say("");

  const mem = memoryReport();
  if (mem) {
    say(`  memory            : ${mem.ram} MB RAM + ${mem.swap} MB swap = ${mem.total} MB`);
    if (mem.total < 3500) {
      say("  WARNING: `npm ci` on this project needs roughly 3.5 GB of RAM+swap to avoid the");
      say("           kernel OOM killer (a 764 MB dependency tree). Ask the environment owner");
      say("           for an adequately provisioned runner rather than shrinking the install.");
    }
    say("");
  }

  // --- reuse a verified installation
  if (fs.existsSync(binDir) && !FORCE) {
    const found = nodeVersionAt(binDir);
    if (found === declared.version) {
      say(`  Reusing verified installation (node v${found}).`);
      reportSuccess(installDir, declared);
      return;
    }
    say(`  Existing directory does not match .nvmrc (found ${found ?? "unusable"}); reinstalling.`);
    fs.rmSync(installDir, { recursive: true, force: true });
  }

  if (CHECK_ONLY) {
    fail(
      `no verified installation of node ${declared.version} at ${installDir}.`,
      "Run without --check to provision it.",
    );
  }

  // --- provision
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (e) {
    fail(
      `install root ${root} cannot be created (${e.code ?? "error"}).`,
      "Point LMS_NODE_ROOT at a user-writable directory and re-run.",
    );
  }
  const archiveName = `${dirName}.tar.xz`;
  const archivePath = path.join(root, archiveName);
  const sumsPath = path.join(root, `SHASUMS256-${declared.version}.txt`);

  const download = async (url, dest) => {
    say(`  GET ${url}`);
    // A bounded timeout matters: without one, a stalled connection hangs the bootstrap
    // forever instead of failing with an actionable message. Observed in practice.
    let res;
    try {
      res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(120_000) });
    } catch (e) {
      const reason = e?.name === "TimeoutError" ? "timed out after 120s" : (e?.message ?? "network error");
      fail(
        `could not download ${url} (${reason}).`,
        "Confirm HTTPS access to nodejs.org, then re-run. Nothing was extracted.",
      );
    }
    if (!res.ok) fail(`download failed (HTTP ${res.status}) from ${url}.`, "Check network access to nodejs.org and retry.");
    let buf;
    try {
      buf = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      fail(`transfer of ${url} was interrupted (${e?.message ?? "error"}).`, "Re-run; nothing was extracted.");
    }
    fs.writeFileSync(dest, buf);
    return buf.length;
  };

  try {
    const archiveBytes = await download(`${DIST_BASE}/v${declared.version}/${archiveName}`, archivePath);
    say(`      ${archiveBytes.toLocaleString()} bytes`);

    // The checksum list is fetched from the same versioned directory as the archive.
    await download(`${DIST_BASE}/v${declared.version}/SHASUMS256.txt`, sumsPath);
    const sums = fs.readFileSync(sumsPath, "utf8");
    const line = sums.split("\n").find((l) => l.trim().endsWith(` ${archiveName}`) || l.trim().endsWith(`*${archiveName}`));
    if (!line) fail(`SHASUMS256.txt has no entry for ${archiveName}; refusing to extract an unverified archive.`);
    const expected = line.trim().split(/\s+/)[0].toLowerCase();

    const actual = sha256(archivePath);
    say(`  checksum expected : ${expected}`);
    say(`  checksum actual   : ${actual}`);
    if (actual !== expected) {
      fail(
        "checksum mismatch — the archive does not match the published SHA-256.",
        "Do not extract it. Delete the download and retry; if it persists, stop and report it.",
      );
    }
    say("  checksum          : MATCH");
    say("");
    say("  Note: this verifies integrity against the checksum published over the same HTTPS");
    say("  channel. It is NOT an independent signature verification (no GPG check against the");
    say("  Node.js release keys). That is sufficient to detect a corrupt or truncated transfer;");
    say("  it does not defend against a compromised distribution origin.");

    // --- extract
    const staging = path.join(root, `.staging-${dirName}`);
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    const tar = spawnSync("tar", ["-xJf", archivePath, "-C", staging, "--strip-components=1"], { encoding: "utf8" });
    if (tar.status !== 0) {
      fs.rmSync(staging, { recursive: true, force: true });
      fail(`extraction failed: ${(tar.stderr || "").trim().split("\n").slice(-1)[0] || "tar exited non-zero"}.`);
    }

    const stagedNode = nodeVersionAt(path.join(staging, "bin"));
    if (stagedNode !== declared.version) {
      fs.rmSync(staging, { recursive: true, force: true });
      fail(`extracted runtime reports node ${stagedNode ?? "unknown"}, expected ${declared.version}.`);
    }

    fs.rmSync(installDir, { recursive: true, force: true });
    fs.renameSync(staging, installDir);

    // --- npm pinning via Corepack, matching packageManager exactly
    const corepack = path.join(binDir, "corepack");
    const bundledNpm = npmVersionAt(binDir);
    if (bundledNpm !== declared.npmVersion) {
      if (!fs.existsSync(corepack)) {
        say("");
        say(`  WARNING: runtime bundles npm ${bundledNpm} but packageManager requires ${declared.npmVersion},`);
        say("           and corepack is unavailable. Install the pinned npm before releasing.");
      } else {
        say("");
        say(`  Pinning npm ${declared.npmVersion} via corepack (bundled: ${bundledNpm})`);
        const prep = spawnSync(corepack, ["prepare", `npm@${declared.npmVersion}`, "--activate"], {
          encoding: "utf8",
          env: { ...process.env, COREPACK_HOME: path.join(root, "corepack-home"), PATH: `${binDir}:${process.env.PATH ?? ""}` },
        });
        if (prep.status !== 0) {
          say(`  WARNING: corepack prepare failed; npm may not match packageManager.`);
          say(`           ${(prep.stderr || "").trim().split("\n").slice(-1)[0] || ""}`);
        }
        spawnSync(corepack, ["enable", "--install-directory", binDir, "npm"], {
          encoding: "utf8",
          env: { ...process.env, COREPACK_HOME: path.join(root, "corepack-home") },
        });
      }
    }

    const finalNpm = npmVersionAt(binDir);
    if (finalNpm !== declared.npmVersion) {
      say("");
      say(`  WARNING: npm is ${finalNpm ?? "unknown"}, packageManager requires ${declared.npmVersion}.`);
    }

    fs.writeFileSync(
      envFilePath(installDir),
      `# Generated by scripts/runtime/setup-node.mjs — source this file.\n` +
        `export PATH="${binDir}:$PATH"\n`,
      "utf8",
    );

    reportSuccess(installDir, declared);
  } finally {
    // Leave no partial download or staging directory behind, on any exit path.
    for (const p of [archivePath, sumsPath, path.join(root, `.staging-${dirName}`)]) {
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    }
  }
}

main().catch((e) => fail(`unexpected failure: ${e.message}`, "Re-run; if it recurs, report the message above."));
