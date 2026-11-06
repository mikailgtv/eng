/**
 * Phase 46 — regression tests for the three user-facing fixes.
 *
 *   BUG-01  /teacher/results had no search at all. Search now runs server-side
 *           through `listResultsForStaff`, ANDed with the viewer's permission
 *           scope (never widening it) and with the existing filters.
 *   BUG-02  missing records answered HTTP 200. The cause was the route-group
 *           `src/app/(app)/loading.tsx`: its Suspense boundary flushed the shell
 *           (and the 200 status) before `notFound()` could run.
 *   TASK-2  quiet hours had no save control of their own and every category
 *           save rewrote them, so the two settings shared one implicit boundary.
 *
 * The search tests execute REAL Prisma queries against a throwaway copy of the
 * database (the repo database is only read from, never written) so they assert
 * observable behaviour rather than source shape. The remaining invariants are
 * source guards, following the F-06 precedent in scripts/test-request-trust.ts:
 * HTTP status codes and UI feedback cannot be proven without a running server,
 * and those were verified end-to-end in the Phase 46 browser run instead.
 *
 * Run: npm run test:phase46
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const results: { name: string; ok: boolean }[] = [];
const pending: Promise<void>[] = [];

function record(name: string, ok: boolean, err?: unknown) {
  results.push({ name, ok });
  if (ok) console.log(`✓ ${name}`);
  else console.log(`✗ ${name}\n    ${(err as Error)?.message ?? ""}`);
}

function check(name: string, fn: () => void) {
  try {
    fn();
    record(name, true);
  } catch (err) {
    record(name, false, err);
  }
}

function checkAsync(name: string, fn: () => Promise<void>) {
  const run = (async () => {
    try {
      await fn();
      record(name, true);
    } catch (err) {
      record(name, false, err);
    }
  })();
  pending.push(run);
}

// ---------------------------------------------------------------- helpers

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function functionBody(source: string, name: string): string {
  const text = stripComments(source);
  const patterns = [`function ${name}(`, `function ${name}<`, `const ${name} =`, `const ${name}:`];
  let start = -1;
  for (const pattern of patterns) {
    start = text.indexOf(pattern);
    if (start !== -1) break;
  }
  assert.notEqual(start, -1, `${name} not found (looked for: ${patterns.join(", ")})`);
  // Skip the parameter list first: a destructured parameter also opens a brace,
  // so balancing from the first "{" would capture the signature, not the body.
  const parenOpen = text.indexOf("(", start);
  let parenDepth = 0;
  let parenClose = -1;
  for (let i = parenOpen; i < text.length; i += 1) {
    if (text[i] === "(") parenDepth += 1;
    else if (text[i] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) { parenClose = i; break; }
    }
  }
  const open = text.indexOf("{", parenClose === -1 ? start : parenClose);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces while reading ${name}`);
}

const sha256 = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// ================================================================ BUG-01
// Real queries against a disposable copy of the SQLite database.

const sourceDb = path.join(root, "prisma", "dev.db");
const originalHash = sha256(sourceDb);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "p46-regression-"));
const dbCopy = path.join(tempDir, "regression.db");
fs.copyFileSync(sourceDb, dbCopy);

const originalUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = `file:${dbCopy}`;

const createdAttemptIds: string[] = [];
let cleanup: () => Promise<void> = async () => {};

checkAsync("BUG-01: search narrows by student, assessment and combination", async () => {
  // src/lib/assessment/queries.ts is a server module: it transitively imports
  // next/server, which requires React's `cache`. That helper only exists in the
  // react-server build, so outside Next.js we supply an identity pass-through —
  // caching is what `cache` does, and the query result is identical without it.
  const requireFromRoot = createRequire(path.join(root, "package.json"));
  const reactModule = requireFromRoot("react");
  if (typeof reactModule.cache !== "function") reactModule.cache = (fn: unknown) => fn;

  const { PrismaClient } = await import("@prisma/client");
  const { listResultsForStaff } = await import("../src/lib/assessment/queries");
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbCopy}` } } });

  try {
    const teacher = await prisma.user.findFirst({ where: { role: "TEACHER" }, orderBy: { id: "asc" } });
    assert.ok(teacher, "no TEACHER row in the database copy — run npm run db:seed first");
    const groups = await prisma.learningGroup.findMany({ where: { teacherId: teacher.id }, select: { id: true } });
    assert.ok(groups.length > 0, "the seeded teacher owns no groups");
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", groupId: { in: groups.map((g) => g.id) } },
      orderBy: { lastName: "asc" },
      take: 5,
    });
    assert.ok(students.length >= 2, "need at least two students in the teacher's groups");
    const assessments = await prisma.assessment.findMany({ orderBy: { title: "asc" }, take: 3, select: { id: true, title: true } });
    assert.ok(assessments.length >= 2, "need at least two assessments");

    // 30 attempts: 5 students x 3 assessments x 2 attempts (only where an
    // assessment exists), enough to exercise a second page (pageSize = 25).
    let n = 0;
    outer: for (const student of students) {
      for (const assessment of assessments) {
        for (const attemptNumber of [1, 2]) {
          if (n >= 30) break outer;
          const percentage = 40 + n * 2;
          const row = await prisma.assessmentAttempt.create({
            data: {
              assessmentId: assessment.id,
              studentId: student.id,
              attemptNumber,
              status: n % 5 === 0 ? "GRADED" : "SUBMITTED",
              submittedAt: new Date(Date.UTC(2026, 8, 1 + n, 10, 0, 0)),
              startedAt: new Date(Date.UTC(2026, 8, 1 + n, 9, 30, 0)),
              questionOrder: "[]",
              score: percentage,
              totalPoints: 100,
              percentage,
              passed: percentage >= 60,
              timeSpentSec: 1800,
            },
            select: { id: true },
          });
          createdAttemptIds.push(row.id);
          n += 1;
        }
      }
    }
    const viewer = { id: teacher.id, role: "TEACHER", groupId: teacher.groupId ?? null } as never;
    const all = await listResultsForStaff(viewer, { page: 1 });
    assert.equal(all.total, createdAttemptIds.length, "baseline should see every created attempt");

    const target = students[0];
    const targetTotal = createdAttemptIds.length === 30 ? 6 : all.total;
    const byFirstName = await listResultsForStaff(viewer, { q: target.firstName });
    assert.ok(byFirstName.total > 0, "searching a known first name should match");
    assert.ok(byFirstName.total <= targetTotal, "search must not return more rows than exist");
    assert.ok(byFirstName.rows.length > 0);

    const byLastName = await listResultsForStaff(viewer, { q: target.lastName });
    assert.equal(byLastName.total, byFirstName.total, "first and last name search should match the same student");

    const byFullName = await listResultsForStaff(viewer, { q: `${target.firstName} ${target.lastName}` });
    assert.equal(byFullName.total, byFirstName.total, "token AND must match a full name, not drop it");

    const byAssessment = await listResultsForStaff(viewer, { q: assessments[0].title.slice(0, 12) });
    assert.ok(byAssessment.total > 0, "searching an assessment title fragment should match");
    assert.ok(
      byAssessment.rows.every((r) => r.assessmentTitle.includes(assessments[0].title.slice(0, 12))),
      "assessment-title search must not return rows for other assessments"
    );

    const noMatch = await listResultsForStaff(viewer, { q: "zzz-no-such-term-zzz" });
    assert.equal(noMatch.total, 0, "a nonexistent term must return nothing");
    assert.equal(noMatch.rows.length, 0);

    // filters and search combine with AND semantics
    const passed = await listResultsForStaff(viewer, { q: target.firstName, result: "PASSED" });
    assert.ok(passed.rows.every((r) => r.passed === true), "result filter must still apply while searching");
    assert.ok(passed.total <= byFirstName.total, "combining a filter may only narrow the set");

    // pagination: a search that narrows results must not leave an empty page
    const beyond = await listResultsForStaff(viewer, { q: target.firstName, page: 9 });
    assert.ok(beyond.rows.length > 0, "an out-of-range page must fall back to a real page, not render empty");
    assert.ok(beyond.page >= 1 && beyond.page <= Math.max(1, Math.ceil(beyond.total / beyond.pageSize)));

    // permission scope: a teacher who owns none of these groups sees nothing,
    // even with a search term that matches every row for the owning teacher.
    const outsider = await prisma.user.create({
      data: {
        email: `p46-outsider-${Date.now()}@example.test`,
        username: `p46-outsider-${Date.now()}`,
        firstName: "P46",
        lastName: "Outsider",
        role: "TEACHER",
        passwordHash: "not-a-real-hash",
        employeeCode: `P46-${Date.now()}`,
      },
      select: { id: true },
    });
    const outsiderRows = await listResultsForStaff(
      { id: outsider.id, role: "TEACHER", groupId: null } as never,
      { q: target.firstName }
    );
    assert.equal(outsiderRows.total, 0, "search must never widen the viewer's permission scope");
    await prisma.user.delete({ where: { id: outsider.id } });
  } finally {
    cleanup = async () => {
      for (const id of createdAttemptIds) {
        await prisma.assessmentAttempt.delete({ where: { id } }).catch(() => undefined);
      }
      await prisma.$disconnect();
    };
  }
});

// ================================================================ BUG-02

check("BUG-02: the route-group loading.tsx that forced HTTP 200 is gone", () => {
  assert.equal(
    fs.existsSync(path.join(root, "src/app/(app)/loading.tsx")),
    false,
    "src/app/(app)/loading.tsx puts a Suspense boundary above every page, so notFound() streams with a 200"
  );
});

check("BUG-02: missing admin user calls notFound() instead of rendering an EmptyState", () => {
  const page = read("src/app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /import \{ notFound \} from "next\/navigation"/, "notFound must be imported from next/navigation");
  assert.match(page, /if \(!student\) notFound\(\);/, "a missing user must call notFound()");
  assert.doesNotMatch(page, /<EmptyState/, "the page must not render its own not-found empty state");
  // the authorization check must run before the lookup so auth failures are never 404s
  assert.ok(
    page.indexOf("requirePageUser") < page.indexOf("getUserById"),
    "requirePageUser must run before the existence check"
  );
});

check("BUG-02: the admin 404 keeps the in-shell empty state", () => {
  const notFoundFile = "src/app/(app)/admin/users/[id]/not-found.tsx";
  assert.ok(fs.existsSync(path.join(root, notFoundFile)), "a segment not-found.tsx should preserve the existing copy");
  const body = read(notFoundFile);
  assert.match(body, /User not found\./, "the user-facing copy must be preserved");
  assert.match(body, /Back to users/, "the recovery action must be preserved");
});

check("BUG-02: teacher detail routes keep their notFound() calls", () => {
  for (const route of ["teacher/classes/[id]", "teacher/groups/[id]", "teacher/exams/[id]", "student/exams/[id]"]) {
    const file = `src/app/(app)/${route}/page.tsx`;
    assert.match(read(file), /notFound\(\)/, `${file} should still call notFound()`);
  }
});

// ================================================================ TASK-2

check("TASK-2: quiet hours have their own form and save control", () => {
  const source = read("src/components/communication/actions.tsx");
  const form = functionBody(source, "PreferenceForm");
  assert.match(form, /body: \{ quietStart: start, quietEnd: end \}/, "quiet hours must be saved without a category");
  assert.match(form, /Save quiet hours/, "the quiet-hours section needs its own visible save control");
  assert.match(form, /role="status"/, "quiet-hours save needs inline feedback");
});

check("TASK-2: a category save no longer rewrites quiet hours", () => {
  const source = read("src/components/communication/actions.tsx");
  const categoryForm = functionBody(source, "PreferenceCategoryForm");
  assert.match(categoryForm, /category: item\.category/, "a category save must send its category");
  assert.doesNotMatch(categoryForm, /quietStart/, "a category save must not send quietStart");
  assert.doesNotMatch(categoryForm, /quietEnd/, "a category save must not send quietEnd");
  assert.match(categoryForm, /role="status"/, "each category save needs feedback next to its own button");
});

check("TASK-2: the preferences endpoint accepts a quiet-hours-only save", () => {
  const route = read("src/app/api/communication/preferences/route.ts");
  assert.match(route, /saveQuietHours/, "the route must persist quiet hours on their own");
  assert.match(route, /if \(!body\.category && !hasQuietHours\) throw new ApiError\(400, "Choose a category\."\)/);
  assert.match(route, /if \(!body\.category\) \{/, "a category-less request must take the quiet-hours path");
});

check("TASK-2: quiet hours are stored on their own row helper", () => {
  const hub = read("src/lib/communication/hub.ts");
  const fn = functionBody(hub, "saveQuietHours");
  assert.match(fn, /communicationPreference\.upsert/, "quiet hours belong to CommunicationPreference");
  assert.match(fn, /quietStart/, "the helper must write quietStart");
  assert.doesNotMatch(fn, /notificationPreference/, "saving quiet hours must not touch per-category rows");
});

// ---------------------------------------------------------------- summary

async function summary() {
  await Promise.all(pending);
  await cleanup();
  process.env.DATABASE_URL = originalUrl;
  fs.rmSync(tempDir, { recursive: true, force: true });

  check("integrity: the repository database was not modified", () => {
    assert.equal(sha256(sourceDb), originalHash, "prisma/dev.db must be byte-identical after the tests");
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Phase 46 regressions: ${results.length - failed.length} passed, ${failed.length} failed ===\n`);
  if (failed.length) process.exitCode = 1;
}

summary().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
