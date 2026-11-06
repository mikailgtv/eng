/**
 * Phase 16 mobile web checks. Confirms the same app serves phone-sized
 * sessions and that primary routes still load. Layout measurement needs a
 * browser; this script checks the responsive markers and route availability.
 */
import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

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
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

async function page(cookie: string, path: string, marker: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile" } });
  const html = await res.text();
  const pass = res.status === 200 && html.includes(marker);
  pass ? ok(`${path}`) : bad(`${path} ${res.status} marker=${html.includes(marker)}`);
}

async function main() {
  const manifest = await fetch(`${BASE}/manifest.webmanifest`);
  manifest.status === 200 ? ok("manifest") : bad(`manifest ${manifest.status}`);
  const offline = await fetch(`${BASE}/offline.html`);
  offline.status === 200 ? ok("offline page") : bad(`offline ${offline.status}`);
  const home = await fetch(`${BASE}/login`);
  const loginHtml = await home.text();
  loginHtml.includes("width=device-width") ? ok("viewport meta") : bad("viewport meta missing");

  const student = await login("james.carter", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  student.status === 200 && teacher.status === 200 && admin.status === 200 ? ok("role logins") : bad("role logins");

  const studentPaths = ["/student", "/student/learning", "/student/review", "/student/tutor", "/student/speaking", "/student/listening", "/student/assignments", "/student/exams", "/student/certificates", "/student/messages", "/student/notifications", "/student/plan", "/student/achievements", "/student/profile", "/student/security"];
  for (const path of studentPaths) await page(student.cookie, path, "More");
  const teacherPaths = ["/teacher", "/teacher/classes", "/teacher/attendance", "/teacher/students", "/teacher/content", "/teacher/assignments", "/teacher/exams", "/teacher/speaking", "/teacher/listening", "/teacher/messages", "/teacher/reports", "/teacher/security"];
  for (const path of teacherPaths) await page(teacher.cookie, path, "More");
  const adminPaths = ["/admin", "/admin/users", "/admin/organization", "/admin/groups", "/admin/content", "/admin/reports", "/admin/certificates", "/admin/notifications", "/admin/security", "/admin/roles", "/admin/settings"];
  for (const path of adminPaths) await page(admin.cookie, path, "More");

  console.log(failed === 0 ? "\nAll phase 16 route checks passed" : `\n${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
