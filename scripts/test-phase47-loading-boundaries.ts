/**
 * Phase 47 — loading-boundary placement guards.
 *
 * Phase 46 removed `src/app/(app)/loading.tsx` because a Suspense boundary above
 * a route flushes the response as HTTP 200 before `notFound()` can run, turning
 * every missing-record 404 into a soft 200.
 *
 * Phase 47 restores loading UI for three list pages by scoping each boundary to a
 * `(list)` route group, so it wraps exactly one page and no detail route. These
 * tests lock that invariant in: any `loading.tsx` added in future must not sit
 * above a page that calls `notFound()`.
 *
 * Run: npm run test:phase47
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const APP = "src/app";
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const results: { name: string; ok: boolean }[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`✗ ${name}\n    ${(err as Error).message}`);
  }
}

const allFiles = walk(APP);
const loadingFiles = allFiles.filter((p) => p.endsWith("loading.tsx"));

check("the global (app) loading boundary is still absent", () => {
  assert.equal(fs.existsSync(path.join(APP, "(app)", "loading.tsx")), false, "src/app/(app)/loading.tsx must not be restored");
});

check("the three approved list pages have a loading boundary", () => {
  for (const expected of [
    "src/app/(app)/admin/users/(list)/loading.tsx",
    "src/app/(app)/teacher/results/(list)/loading.tsx",
    "src/app/(app)/student/notifications/(list)/loading.tsx",
  ]) {
    assert.ok(fs.existsSync(path.join(root, expected)), `${expected} is missing`);
  }
});

check("no loading boundary sits directly above a detail route", () => {
  // A boundary at these paths would also wrap the sibling [id] route.
  for (const forbidden of [
    "src/app/(app)/admin/users/loading.tsx",
    "src/app/(app)/teacher/results/loading.tsx",
    "src/app/(app)/student/notifications/loading.tsx",
  ]) {
    assert.equal(fs.existsSync(path.join(root, forbidden)), false, `${forbidden} would wrap a sibling detail route and force HTTP 200 over its 404`);
  }
});

check("every loading boundary wraps a subtree with no notFound() page", () => {
  assert.ok(loadingFiles.length >= 3, `expected at least 3 loading boundaries, found ${loadingFiles.length}`);
  for (const file of loadingFiles) {
    const segment = path.dirname(file);
    const offenders = walk(segment).filter((p) => p.endsWith("page.tsx") && /notFound\(\)/.test(read(p)));
    assert.deepEqual(
      offenders,
      [],
      `${file} is a Suspense boundary above ${offenders.join(", ")} — notFound() there will answer HTTP 200 instead of 404`
    );
  }
});

check("each loading boundary wraps exactly one page", () => {
  for (const file of loadingFiles) {
    const pages = walk(path.dirname(file)).filter((p) => p.endsWith("page.tsx"));
    assert.equal(pages.length, 1, `${file} should wrap a single page, found: ${pages.join(", ")}`);
  }
});

check("the admin user 404 keeps its preserved not-found UI", () => {
  assert.ok(fs.existsSync(path.join(root, "src/app/(app)/admin/users/[id]/not-found.tsx")), "the segment not-found.tsx is missing");
  assert.match(read("src/app/(app)/admin/users/[id]/page.tsx"), /if \(!student\) notFound\(\);/, "the detail page must still call notFound()");
});

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Phase 47 loading boundaries: ${results.length - failed.length} passed, ${failed.length} failed ===\n`);
if (failed.length) process.exitCode = 1;
