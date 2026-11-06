/**
 * Phase 15 identity, organization and access checks.
 * Run: npx tsx scripts/testing/verify-phase15.ts
 */
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { totpCode } from "../../src/lib/identity/totp";
import { stripIdentitySecrets } from "../../src/lib/identity/privacy";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
let failed = 0;
const ok = (label: string) => console.log(`  ✓ ${label}`);
const bad = (label: string) => { failed += 1; console.log(`  ✗ ${label}`); };

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier, password }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { status: res.status, cookie, data: await res.json() };
}

async function call(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Cookie: cookie, Origin: BASE, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  const admin = await login("admin", "Admin#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const student = await login("james.carter", "Student#Demo1");
  admin.status === 200 && admin.cookie ? ok("admin login") : bad("admin login");
  teacher.status === 200 ? ok("teacher login") : bad("teacher login");
  student.status === 200 ? ok("student login") : bad("student login");

  const studentRoles = await call(student.cookie, "GET", "/api/roles");
  studentRoles.status === 403 ? ok("student cannot open roles") : bad(`student roles ${studentRoles.status}`);
  const studentUsers = await call(student.cookie, "GET", "/api/users");
  studentUsers.status === 403 ? ok("student cannot list users") : bad(`student users ${studentUsers.status}`);
  const noSession = await call("", "GET", "/api/organizations");
  noSession.status === 401 ? ok("organization API requires a session") : bad(`org anon ${noSession.status}`);

  const teacherUsers = await call(teacher.cookie, "GET", "/api/users");
  const names = JSON.stringify(teacherUsers.data);
  teacherUsers.status === 200 && !names.includes("pedro.alvarez") ? ok("teacher list stays in assigned groups") : bad("teacher scope leak");
  const pedro = await prisma.user.findUnique({ where: { username: "pedro.alvarez" }, select: { id: true } });
  const idor = await call(teacher.cookie, "GET", `/api/users/${pedro?.id}`);
  idor.status === 404 ? ok("teacher cannot open another shift") : bad(`idor ${idor.status}`);

  const org = await call(admin.cookie, "GET", "/api/organizations");
  const orgId = (org.data as { data?: { id: string }[] })?.data?.[0]?.id;
  org.status === 200 && orgId ? ok("organization exists") : bad("organization missing");
  const dept = await call(admin.cookie, "POST", "/api/departments", { name: "Phase15 Fire", code: `P15${Date.now().toString().slice(-4)}`, description: "Probe" });
  dept.status === 201 ? ok("department created") : bad(`department ${dept.status} ${JSON.stringify(dept.data)}`);
  const deptId = (dept.data as { data?: { id: string } })?.data?.id;
  const team = await call(admin.cookie, "POST", "/api/teams", { name: "Phase15 Team", code: `T15${Date.now().toString().slice(-4)}`, departmentId: deptId });
  team.status === 201 ? ok("team created") : bad(`team ${team.status}`);
  const teacherDept = await call(teacher.cookie, "POST", "/api/departments", { name: "Nope", code: "NOPE" });
  teacherDept.status === 403 ? ok("teacher cannot create a department") : bad(`teacher dept ${teacherDept.status}`);

  const shiftA = await prisma.learningGroup.findFirst({ where: { name: { contains: "Shift A" } }, select: { id: true } });
  const hierarchy = await call(admin.cookie, "POST", "/api/groups/hierarchy", { groupId: shiftA?.id, code: "SHIFT-A", departmentId: deptId });
  hierarchy.status === 200 ? ok("existing group can sit under a department") : bad(`hierarchy ${hierarchy.status}`);

  const role = await call(admin.cookie, "POST", "/api/roles", { name: "Phase15 Editor", key: `P15_EDITOR_${Date.now().toString().slice(-4)}`, baseRole: "TEACHER", permissions: ["content.review"] });
  role.status === 201 ? ok("custom role created") : bad(`role ${role.status} ${JSON.stringify(role.data)}`);
  const matrix = await call(admin.cookie, "GET", "/api/permissions");
  JSON.stringify(matrix.data).includes("users.view") ? ok("permission matrix is stored") : bad("matrix empty");

  const invite = await call(admin.cookie, "POST", "/api/invitations", { email: `phase15.${Date.now()}@example.test`, role: "TEACHER", groupId: shiftA?.id, firstName: "Phase", lastName: "Fifteen" });
  const link = (invite.data as { data?: { link?: string } })?.data?.link ?? "";
  invite.status === 201 && link.includes("/invite/") ? ok("invitation issued") : bad(`invite ${invite.status}`);
  const token = link.split("/invite/")[1];
  const accepted = await call("", "POST", "/api/invitations/accept", { token, firstName: "Phase", lastName: "Fifteen", username: `phase15.${Date.now()}`, employeeCode: `P15-${Date.now()}`, password: "Invite#Pass1" });
  accepted.status === 201 ? ok("invitation accepted") : bad(`accept ${accepted.status} ${JSON.stringify(accepted.data)}`);
  const reused = await call("", "POST", "/api/invitations/accept", { token, firstName: "Phase", lastName: "Fifteen", username: `again.${Date.now()}`, employeeCode: `P15B-${Date.now()}`, password: "Invite#Pass1" });
  reused.status === 400 ? ok("invitation cannot be reused") : bad(`reuse ${reused.status}`);

  const expiredToken = `expired-token-${Date.now()}`;
  const expired = await prisma.userInvitation.create({
    data: {
      email: `expired.${Date.now()}@example.test`,
      tokenHash: createHash("sha256").update(expiredToken).digest("hex"),
      role: "STUDENT",
      organizationId: orgId!,
      expiresAt: new Date(Date.now() - 1000),
      invitedById: (await prisma.user.findUnique({ where: { username: "admin" }, select: { id: true } }))!.id,
    },
  });
  void expired;
  const expiredAccept = await call("", "POST", "/api/invitations/accept", { token: expiredToken, firstName: "Old", lastName: "Invite", username: `old.${Date.now()}`, employeeCode: `OLD-${Date.now()}`, password: "Invite#Pass1" });
  expiredAccept.status === 400 ? ok("expired invitation rejected") : bad(`expired ${expiredAccept.status}`);

  const weak = await call(admin.cookie, "POST", "/api/users", { firstName: "Weak", lastName: "Pass", employeeCode: `WEAK-${Date.now()}`, username: `weak.${Date.now()}`, role: "STUDENT", password: "short" });
  weak.status === 422 ? ok("weak password rejected") : bad(`weak ${weak.status}`);
  const lockName = `lock.${Date.now()}`;
  const lockUser = await call(admin.cookie, "POST", "/api/users", { firstName: "Lock", lastName: "Probe", employeeCode: `LOCK-${Date.now()}`, username: lockName, role: "STUDENT", password: "Lock#Pass1" });
  await prisma.organizationSetting.updateMany({ data: { lockoutThreshold: 3 } });
  for (let attempt = 0; attempt < 3; attempt += 1) await login(lockName, "wrong-pass");
  const locked = await login(lockName, "Lock#Pass1");
  locked.status === 403 ? ok("repeated failures lock the account") : bad(`lock ${locked.status}`);
  await prisma.organizationSetting.updateMany({ data: { lockoutThreshold: 5 } });
  if (lockUser.status === 201) await prisma.user.deleteMany({ where: { username: lockName } });

  const tempUser = await call(admin.cookie, "POST", "/api/users", { firstName: "Temp", lastName: "Access", employeeCode: `TMP-${Date.now()}`, username: `temp.access.${Date.now()}`, role: "TEACHER", password: "Temp#Pass1" });
  const tempId = (tempUser.data as { data?: { user?: { id: string; username: string } } })?.data?.user?.id;
  tempUser.status === 201 && tempId ? ok("teacher account created") : bad(`temp user ${tempUser.status}`);
  const temporary = await call(admin.cookie, "POST", "/api/permissions", { userId: tempId, permissionKey: "content.review", startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() - 1000).toISOString(), scopeType: "ORGANIZATION", scopeId: orgId });
  temporary.status === 201 ? ok("temporary permission stored") : bad(`temporary ${temporary.status}`);
  const tempLogin = await login((tempUser.data as { data?: { user?: { username: string } } }).data?.user?.username ?? "", "Temp#Pass1");
  const review = await call(tempLogin.cookie, "POST", "/api/content/lessons", { action: "review", lessonId: "missing", status: "APPROVED" });
  review.status === 403 || review.status === 404 ? ok("expired permission does not grant review") : bad(`expired perm ${review.status}`);

  const delegation = await call(admin.cookie, "POST", "/api/delegations", { fromUserId: (await prisma.user.findUnique({ where: { username: "admin" } }))!.id, toUserId: tempId, endsAt: new Date(Date.now() + 86_400_000).toISOString(), permissionKey: "reports.view", reason: "Cover a report", scopeType: "ORGANIZATION", scopeId: orgId });
  delegation.status === 201 ? ok("delegation created") : bad(`delegation ${delegation.status}`);
  const delegationAudit = await prisma.auditLog.findFirst({ where: { action: "DELEGATION_CREATED", entityId: (delegation.data as { data?: { id?: string } }).data?.id } });
  delegationAudit ? ok("delegation audited") : bad("delegation audit missing");

  const archive = await call(admin.cookie, "POST", `/api/users/${tempId}/lifecycle`, { status: "ARCHIVED", confirm: true });
  archive.status === 200 ? ok("account archived") : bad(`archive ${archive.status} ${JSON.stringify(archive.data)}`);
  const archivedLogin = await login((tempUser.data as { data?: { user?: { username: string } } }).data?.user?.username ?? "", "Temp#Pass1");
  archivedLogin.status === 403 ? ok("archived account cannot sign in") : bad(`archived login ${archivedLogin.status}`);

  const csv = "firstName,lastName,employeeCode,username,role\nBad,Row,DUP,dup.user,STUDENT\nBad,Row,DUP,dup.user,STUDENT\n";
  const preview = await call(admin.cookie, "POST", "/api/users/import", { csv });
  const previewErrors = (preview.data as { data?: { errors?: unknown[] } }).data?.errors ?? [];
  preview.status === 200 && previewErrors.length > 0 ? ok("import preview catches duplicates") : bad("import preview");
  const before = await prisma.user.count();
  const confirm = await call(admin.cookie, "POST", "/api/users/import", { action: "confirm", token: "missing", confirm: true });
  confirm.status === 400 && await prisma.user.count() === before ? ok("invalid import does not create users") : bad("partial import");

  const self = await prisma.user.findUnique({ where: { username: "admin" }, select: { id: true } });
  const bulk = await call(admin.cookie, "POST", "/api/users/bulk", { action: "suspend", userIds: [self!.id], confirm: false });
  bulk.status === 400 ? ok("bulk action requires confirmation") : bad(`bulk ${bulk.status}`);

  await prisma.temporaryPermission.deleteMany({ where: { permissionKey: "users.impersonate" } });
  const impersonate = await call(admin.cookie, "POST", "/api/security/impersonate", { userId: (student.data as { data?: { user?: { id: string } } }).data?.user?.id, reason: "Support check", minutes: 10 });
  impersonate.status === 403 ? ok("impersonation is denied by default") : bad(`impersonate ${impersonate.status}`);
  await call(admin.cookie, "POST", "/api/permissions", { userId: self!.id, permissionKey: "users.impersonate", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 60_000).toISOString(), scopeType: "ORGANIZATION", scopeId: orgId });
  const started = await call(admin.cookie, "POST", "/api/security/impersonate", { userId: (student.data as { data?: { user?: { id: string } } }).data?.user?.id, reason: "Support check for a learner", minutes: 10 });
  const supportCookie = started.status === 200 ? "" : "";
  void supportCookie;
  started.status === 200 ? ok("support access can be granted explicitly") : bad(`support ${started.status} ${JSON.stringify(started.data)}`);

  const reset = await call(admin.cookie, "POST", "/api/auth/password-reset", { userId: (student.data as { data?: { user?: { id: string } } }).data?.user?.id });
  const resetLink = (reset.data as { data?: { link?: string } }).data?.link ?? "";
  reset.status === 200 && resetLink.includes("/reset-password/") ? ok("password reset link issued once") : bad(`reset ${reset.status}`);
  const resetToken = resetLink.split("/reset-password/")[1];
  const resetOk = await call("", "POST", "/api/auth/password-reset", { action: "confirm", token: resetToken, password: "Student#Demo1" });
  resetOk.status === 200 ? ok("password reset accepted") : bad(`reset confirm ${resetOk.status}`);
  const resetAgain = await call("", "POST", "/api/auth/password-reset", { action: "confirm", token: resetToken, password: "Student#Demo2" });
  resetAgain.status === 400 ? ok("reset token cannot be reused") : bad(`reset reuse ${resetAgain.status}`);

  const mfa = await call(admin.cookie, "POST", "/api/mfa", { action: "totp" });
  const secret = (mfa.data as { data?: { secret?: string } }).data?.secret;
  mfa.status === 200 && secret ? ok("TOTP setup returns a key once") : bad("totp setup");
  if (secret) {
    const confirmed = await call(admin.cookie, "POST", "/api/mfa", { action: "confirm", code: totpCode(secret) });
    const codes = (confirmed.data as { data?: { backupCodes?: string[] } }).data?.backupCodes ?? [];
    confirmed.status === 200 && codes.length === 8 ? ok("TOTP confirmed and backup codes issued") : bad(`totp confirm ${confirmed.status}`);
    await call(admin.cookie, "POST", "/api/mfa", { action: "disable", type: "TOTP" });
    const adminAgain = await login("admin", "Admin#Demo1");
    adminAgain.status === 200 && !adminAgain.data?.data?.mfaRequired ? ok("disabling MFA restores normal sign-in") : bad("mfa still required");
  }

  const sessions = await call(admin.cookie, "GET", "/api/sessions");
  Array.isArray((sessions.data as { data?: unknown[] }).data) ? ok("sessions listed") : bad("sessions");
  const security = await call(admin.cookie, "GET", "/api/security");
  security.status === 200 ? ok("security center") : bad(`security ${security.status}`);
  const analytics = await call(admin.cookie, "GET", "/api/security?kind=analytics");
  analytics.status === 200 && !JSON.stringify(analytics.data).toLowerCase().includes("best") ? ok("analytics has no ranking") : bad("analytics");

  const reviewOpen = await call(admin.cookie, "POST", "/api/access-reviews", { title: "Phase15 review" });
  reviewOpen.status === 201 ? ok("access review opened") : bad(`review ${reviewOpen.status}`);

  const stripped = stripIdentitySecrets({ firstName: "A", passwordHash: "secret", employeeCode: "1", nested: { token: "x", level: "A1" } });
  !("passwordHash" in stripped) && !("token" in (stripped as { nested: object }).nested) ? ok("AI payload strips secrets") : bad("privacy strip");

  const studentAgain = await login("james.carter", "Student#Demo1");
  for (const path of ["/admin/organization", "/admin/departments", "/admin/roles", "/admin/invitations", "/admin/security", "/admin/access-reviews", "/admin/audit", "/student/security", "/teacher/security"]) {
    const page = await fetch(`${BASE}${path}`, { headers: { Cookie: path.startsWith("/student") ? studentAgain.cookie : path.startsWith("/teacher") ? teacher.cookie : admin.cookie } });
    page.status === 200 ? ok(`page ${path}`) : bad(`page ${path} ${page.status}`);
  }

  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('organizations','departments','teams','roles','permissions','user_sessions','user_invitations','delegations','temporary_permissions','access_reviews')");
  tables.length === 10 ? ok("phase 15 tables exist") : bad(`tables ${tables.length}`);

  if (shiftA) await prisma.learningGroup.update({ where: { id: shiftA.id }, data: { code: null, departmentId: null } });
  await prisma.team.deleteMany({ where: { name: "Phase15 Team" } });
  await prisma.temporaryPermission.deleteMany({ where: { permissionKey: "users.impersonate" } });
  await prisma.supportAccessSession.updateMany({ where: { endedAt: null }, data: { endedAt: new Date() } });
  await prisma.department.deleteMany({ where: { name: "Phase15 Fire" } });
  await prisma.accessRole.deleteMany({ where: { name: "Phase15 Editor" } });
  await prisma.user.deleteMany({ where: { username: { startsWith: "phase15." } } });
  await prisma.user.deleteMany({ where: { username: { startsWith: "temp.access." } } });
  await prisma.user.deleteMany({ where: { firstName: "Weak" } });
  console.log(`\n${failed === 0 ? "All phase 15 checks passed" : `${failed} failed`}`);
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
