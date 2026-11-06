#!/usr/bin/env node
/**
 * Phase 32E — LIVE authorization regression suite.
 *
 * Authenticates through the REAL /api/auth/login endpoint and drives the REAL
 * protected route handlers over HTTP. Nothing here mocks a guard, an ORM call
 * or a permission helper: a passing case means the deployed route returned the
 * expected status for a real session.
 *
 * Requires: e2e/seed.ts fixtures + the app running against e2e/e2e.db.
 *   DATABASE_URL=file:$PWD/e2e/e2e.db STORAGE_LOCAL_ROOT=$PWD/e2e/storage npx next dev -p 4032
 *
 * SAFETY: synthetic tenants only (E2E_ALPHA / E2E_BRAVO). No production data.
 */
import { readFileSync } from "fs";
import path from "path";

import { resolveTestBase } from "./lib/test-base.mjs";
const BASE = resolveTestBase();
const PASSWORD = "E2eOnly!Passw0rd#32";

const fixtures = JSON.parse(readFileSync(path.join(process.cwd(), "e2e", "fixtures.json"), "utf8"));
const A = fixtures.a;
const B = fixtures.b;

const results = [];
let cookieJar = {};

function record(rec) {
  results.push(rec);
  const mark = rec.pass ? "PASS" : "FAIL";
  const sev = rec.severity || "CRITICAL";
  console.log(
    `${rec.pass ? "✓" : "✗"} [${mark}] ${rec.id} :: ${rec.title} — expected=${rec.expected}, got=${rec.actual}${rec.pass ? "" : ` (${sev})`}`
  );
  if (!rec.pass && rec.note) console.log(`        ↳ ${rec.note}`);
}

async function login(username) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ identifier: username, password: PASSWORD }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const raw = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!raw) throw new Error(`login failed for ${username}: ${res.status} ${await res.text()}`);
  cookieJar[username] = raw;
  return raw;
}

async function call(method, urlPath, { as, body } = {}) {
  const headers = { origin: BASE };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (as) {
    if (!cookieJar[as]) await login(as);
    headers.cookie = cookieJar[as];
  }
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON (file downloads) */
  }
  return { status: res.status, json, text, headers: res.headers };
}

/**
 * A denial case passes when the route refuses with 401/403/404 — never 2xx.
 * Leaking 200 for another tenant's object is the failure the whole phase is about.
 */
async function denyCase(id, title, method, url, opts, allowedStatuses = [401, 403, 404]) {
  const res = await call(method, url, opts);
  record({
    id,
    title,
    expected: allowedStatuses.join("/"),
    actual: res.status,
    pass: allowedStatuses.includes(res.status),
    note: res.status >= 200 && res.status < 300 ? `LEAK: 2xx returned — ${JSON.stringify(res.json)?.slice(0, 160)}` : `body=${(res.text || "").slice(0, 120)}`,
  });
  return res;
}

async function allowCase(id, title, method, url, opts, okStatuses = [200, 201]) {
  const res = await call(method, url, opts);
  record({
    id,
    title,
    expected: okStatuses.join("/"),
    actual: res.status,
    pass: okStatuses.includes(res.status),
    note: res.status >= 400 ? `REGRESSION: authorized flow rejected — ${(res.text || "").slice(0, 200)}` : "",
  });
  return res;
}

async function main() {
  console.log(`\n=== Phase 32E LIVE IDOR suite ===\nBASE=${BASE}\nTenant A org=${A.orgId}\nTenant B org=${B.orgId}\n`);

  // ---------- Baseline: authorized workflows must still work (32H) ----------
  const usersList = await allowCase("L01", "admin A lists users in own tenant", "GET", "/api/users", { as: A.adminUser });
  const listIds = (usersList.json?.data?.users ?? usersList.json?.data ?? []).map?.((u) => u?.id) ?? [];
  record({
    id: "L01b",
    title: "admin A user list stays inside tenant A",
    expected: "no tenant-B users",
    actual: listIds.includes(B.studentId) ? "tenant-B user present" : "clean",
    pass: !listIds.includes(B.studentId),
    note: `vs=${listIds.length}`,
  });

  await allowCase("L02", "admin A reads own student profile", "GET", `/api/users/${A.studentId}`, { as: A.adminUser });
  await allowCase("L03", "teacher A reads student in assigned group", "GET", `/api/users/${A.studentId}`, { as: A.teacherUser });
  await allowCase("L04", "admin A reads own organization list", "GET", "/api/organizations", { as: A.adminUser });
  await allowCase("L05", "teacher A downloads own tenant media", "GET", `/api/content/media/${A.mediaId}`, { as: A.teacherUser });
  await allowCase("L06", "student A downloads own message attachment", "GET", `/api/messages/attachments/${A.attachmentId}`, { as: A.studentUser });
  await allowCase("L07", "admin A views backup status", "GET", "/api/admin/backups/list", { as: A.adminUser });

  // ---------- Authorized LMS workflows must still work (Phase 32H) ----------
  await allowCase("L08", "student A records progress on OWN lesson", "POST", `/api/lessons/${A.lessonId}/access`, { as: A.studentUser, body: {} });
  await allowCase("L09", "teacher A saves attendance on OWN session", "PUT", `/api/teaching/sessions/${A.sessionId}/attendance`, {
    as: A.teacherUser,
    body: { marks: [{ studentId: A.studentId, status: "PRESENT" }] },
  });
  await allowCase("L10", "teacher A publishes OWN homework", "POST", `/api/teaching/assignments/${A.homeworkId}`, { as: A.teacherUser });
  await allowCase("L11", "teacher A opens OWN exam builder", "GET", `/api/assessments/${A.assessmentId}`, { as: A.teacherUser });
  await allowCase("L12", "admin A renames OWN class", "PATCH", `/api/groups/${A.groupId}`, { as: A.adminUser, body: { name: "E2E a Group" } });
  await allowCase("L13", "admin A edits OWN learner", "PATCH", `/api/users/${A.studentId}`, { as: A.adminUser, body: { firstName: "E2EA" } });
  await allowCase("L14", "admin A exports OWN course", "GET", `/api/content/export?courseId=${A.courseId}`, { as: A.adminUser });

  // ---------- SUPER_ADMIN: narrow, audited cross-tenant exception ----------
  {
    const res = await call("GET", `/api/users/${B.studentId}`, { as: A.superUser });
    record({
      id: "L15",
      title: "SUPER_ADMIN may cross tenants (explicit exception)",
      expected: "200",
      actual: res.status,
      pass: res.status === 200,
      note: res.status === 200 ? "" : `super admin wrongly blocked: ${(res.text || "").slice(0, 120)}`,
    });
  }

  // ---------- Cross-tenant: private learner records ----------
  await denyCase("D01", "admin A reads tenant-B student profile (user IDOR)", "GET", `/api/users/${B.studentId}`, { as: A.adminUser });
  await denyCase("D02", "teacher A reads tenant-B student profile", "GET", `/api/users/${B.studentId}`, { as: A.teacherUser });
  await denyCase("D03", "admin A reads tenant-B admin profile", "GET", `/api/users/${B.adminId}`, { as: A.adminUser });
  await denyCase("D04", "teacher A reads unassigned tenant-B teacher", "GET", `/api/users/${B.teacherId}`, { as: A.teacherUser });

  // ---------- Cross-tenant: organization boundary ----------
  const orgsRes = await call("GET", "/api/organizations", { as: A.adminUser });
  const orgIds = (orgsRes.json?.data ?? []).map((o) => o?.id);
  record({
    id: "D05",
    title: "organization list does not expose tenant B",
    expected: "only tenant A",
    actual: orgIds.includes(B.orgId) ? "B leaked" : `count=${orgIds.length}`,
    pass: !orgIds.includes(B.orgId),
    note: JSON.stringify(orgIds),
  });
  await denyCase("D06", "admin A patches tenant-B organization", "PATCH", "/api/organizations", {
    as: A.adminUser,
    body: { id: B.orgId, name: "Hijacked by tenant A" },
  });

  // ---------- Cross-tenant: classes / groups ----------
  await denyCase("D07", "admin A patches tenant-B class (group)", "PATCH", `/api/groups/${B.groupId}`, {
    as: A.adminUser,
    body: { name: "Hijacked class" },
  });
  await denyCase("D08", "teacher A patches tenant-B class", "PATCH", `/api/groups/${B.groupId}`, {
    as: A.teacherUser,
    body: { name: "Teacher hijack" },
  });

  // ---------- Cross-tenant: exams ----------
  await denyCase("D09", "teacher A opens tenant-B exam builder", "GET", `/api/assessments/${B.assessmentId}`, { as: A.teacherUser });
  await denyCase("D10", "admin A opens tenant-B exam builder", "GET", `/api/assessments/${B.assessmentId}`, { as: A.adminUser });

  // ---------- Cross-tenant: homework ----------
  await denyCase("D11", "teacher A publishes tenant-B homework", "POST", `/api/teaching/assignments/${B.homeworkId}`, { as: A.teacherUser });

  // ---------- Cross-tenant: attendance ----------
  await denyCase("D12", "teacher A writes attendance into tenant-B session", "PUT", `/api/teaching/sessions/${B.sessionId}/attendance`, {
    as: A.teacherUser,
    body: { marks: [{ studentId: B.studentId, status: "ABSENT" }] },
  });

  // ---------- Cross-tenant: courses / content ----------
  await denyCase("D13", "teacher A exports tenant-B course", "GET", `/api/content/export?courseId=${B.courseId}`, { as: A.teacherUser });
  await denyCase("D14", "admin A exports tenant-B course", "GET", `/api/content/export?courseId=${B.courseId}`, { as: A.adminUser });
  await denyCase("D15", "student A records progress on tenant-B lesson", "POST", `/api/lessons/${B.lessonId}/access`, { as: A.studentUser, body: {} });

  // ---------- Cross-tenant: files / audio ----------
  await denyCase("D16", "teacher A downloads tenant-B private media", "GET", `/api/content/media/${B.mediaId}`, { as: A.teacherUser });
  await denyCase("D17", "admin A downloads tenant-B private media", "GET", `/api/content/media/${B.mediaId}`, { as: A.adminUser });
  await denyCase("D18", "student A downloads tenant-B message attachment", "GET", `/api/messages/attachments/${B.attachmentId}`, { as: A.studentUser });
  await denyCase("D19", "teacher A downloads tenant-B message attachment", "GET", `/api/messages/attachments/${B.attachmentId}`, { as: A.teacherUser });

  // ---------- Role self-escalation ----------
  await denyCase("D20", "student A self-promotes to ADMIN via PATCH /users", "PATCH", `/api/users/${A.studentId}`, {
    as: A.studentUser,
    body: { role: "ADMIN" },
  });
  await denyCase("D21", "teacher A assigns itself SUPER_ADMIN", "POST", "/api/roles", {
    as: A.teacherUser,
    body: { action: "assign", userId: A.teacherId, roleKey: "SUPER_ADMIN", scopeType: "ORGANIZATION", scopeId: A.orgId },
  });
  await denyCase("D22", "admin A grants SUPER_ADMIN to tenant-B user", "POST", "/api/roles", {
    as: A.adminUser,
    body: { action: "assign", userId: B.adminId, roleKey: "SUPER_ADMIN", scopeType: "ORGANIZATION", scopeId: B.orgId },
  });
  await denyCase("D23", "student A grants itself a temporary permission", "POST", "/api/permissions", {
    as: A.studentUser,
    body: { userId: A.studentId, permissionKey: "roles.manage", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 864e5).toISOString() },
  });

  // ---------- Backups ----------
  await denyCase("D24", "teacher A creates a database backup", "POST", "/api/admin/backups/database", { as: A.teacherUser, body: {} });
  await denyCase("D25", "student A creates a database backup", "POST", "/api/admin/backups/database", { as: A.studentUser, body: {} });
  await denyCase("D26", "teacher A lists backup artifacts", "GET", "/api/admin/backups/list", { as: A.teacherUser });
  await denyCase("D27", "teacher A starts a restore drill", "POST", "/api/admin/backups/restore-drill", { as: A.teacherUser, body: {} });

  // ---------- Bulk / export ----------
  await denyCase("D28", "admin A bulk-suspends tenant-B users", "POST", "/api/users/bulk", {
    as: A.adminUser,
    body: { action: "suspend", userIds: [B.studentId, B.student2Id], confirm: true },
  });

  // ---------- Ownership / tenant reassignment via request body ----------
  // A spoofed organizationId must never place a row in another tenant. Either the
  // request is refused, or it is created inside the ACTOR's tenant.
  {
    const res = await call("POST", "/api/users", {
      as: A.adminUser,
      body: {
        firstName: "E2E", lastName: "Spoof", username: "e2e.spoof.a", employeeCode: "E2E_SPOOF",
        email: "e2e.spoof.a@example.invalid", password: "E2eOnly!Passw0rd#32", role: "STUDENT",
        organizationId: B.orgId,
      },
    });
    const placedIn = res.json?.data?.organizationId ?? res.json?.data?.user?.organizationId ?? null;
    const refused = res.status >= 400;
    record({
      id: "D29",
      title: "admin A creates a user with spoofed tenant-B org id",
      expected: "refused, or created in tenant A",
      actual: res.status + (placedIn ? ` org=${placedIn === B.orgId ? "B" : "A"}` : ""),
      pass: refused || placedIn === A.orgId,
      note: placedIn === B.orgId ? "LEAK: row created inside tenant B" : `body=${(res.text || "").slice(0, 140)}`,
    });
  }

  // ---------- Alternate endpoints ----------
  await denyCase("D30", "teacher A reads tenant-B roles matrix", "GET", "/api/roles", { as: A.teacherUser });
  await denyCase("D31", "unauthenticated user list", "GET", "/api/users", {});
  await denyCase("D32", "unauthenticated private media download", "GET", `/api/content/media/${A.mediaId}`, {});
  await denyCase("D33", "unauthenticated tenant-B attachment", "GET", `/api/messages/attachments/${B.attachmentId}`, {});
  await denyCase("D34", "unauthenticated backup list", "GET", "/api/admin/backups/list", {});

  // ---------- Summary ----------
  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== Results: ${results.length - failed.length} passed, ${failed.length} failed ===`);
  if (failed.length) {
    console.log("\nFAILURES (these are real cross-tenant leaks / regressions):");
    for (const f of failed) console.log(`  ✗ ${f.id} ${f.title} — got ${f.actual}`);
  }
  const out = path.join(process.cwd(), "e2e", "live-results.json");
  const { writeFileSync } = await import("fs");
  writeFileSync(out, JSON.stringify({ base: BASE, ranAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nResults written to ${path.relative(process.cwd(), out)}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("SUITE ERROR:", err);
  process.exit(2);
});
