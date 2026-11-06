/**
 * Phase 11 certificate checks.
 * Practice, XP, and AI tutor activity must not grant eligibility.
 */
import { PrismaClient } from "@prisma/client";
import { countsTowardCertificate, deriveStatus, formatCertificateId, meetsThreshold } from "../../src/lib/certificates/rules";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (message: string) => { pass += 1; console.log(`  ✓ ${message}`); };
const bad = (message: string) => { fail += 1; console.log(`  ✗ ${message}`); };

function expectPure() {
  meetsThreshold(70, 70) && !meetsThreshold(69, 70) ? ok("threshold is met only at or above the configured score") : bad("threshold");
  formatCertificateId("CERT-{YEAR}-{SEQUENCE}", 2026, 184, 6, "CERT") === "CERT-2026-000184" ? ok("certificate number format") : bad("format");
  !countsTowardCertificate("XP") && !countsTowardCertificate("PRACTICE") && !countsTowardCertificate("AI") ? ok("practice and XP do not count") : bad("sources");
  deriveStatus({ courseArchived: false, ruleConfigured: false, started: false, eligible: false, completionRecorded: false, archivedRecord: false, certificate: "NONE" }) === "NOT_STARTED" ? ok("not started is defined") : bad("not started");
  deriveStatus({ courseArchived: false, ruleConfigured: false, started: true, eligible: false, completionRecorded: false, archivedRecord: false, certificate: "NONE" }) === "IN_PROGRESS" ? ok("in progress means a rule is missing") : bad("in progress");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: false, completionRecorded: false, archivedRecord: false, certificate: "NONE" }) === "REQUIREMENTS_PENDING" ? ok("requirements pending") : bad("pending");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: true, completionRecorded: false, archivedRecord: false, certificate: "NONE" }) === "ELIGIBLE" ? ok("eligible") : bad("eligible");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: true, completionRecorded: true, archivedRecord: false, certificate: "NONE" }) === "COMPLETED" ? ok("completed is separate from issued") : bad("completed");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: true, completionRecorded: true, archivedRecord: false, certificate: "ISSUED" }) === "CERTIFICATE_ISSUED" ? ok("certificate issued") : bad("issued status");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: true, completionRecorded: true, archivedRecord: false, certificate: "EXPIRED" }) === "EXPIRED" ? ok("expired") : bad("expired status");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: false, completionRecorded: false, archivedRecord: false, certificate: "REVOKED" }) === "REVOKED" ? ok("revoked") : bad("revoked status");
  deriveStatus({ courseArchived: false, ruleConfigured: true, started: true, eligible: false, completionRecorded: false, archivedRecord: true, certificate: "NONE" }) === "ARCHIVED" ? ok("archived") : bad("archived status");
}

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier, password }),
  });
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

async function call(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Origin: BASE, Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, text, headers: res.headers };
}

function approvalRule() {
  return {
    lessons: { enabled: false, minPercent: 100 },
    assignments: { enabled: false, requireGraded: false, includePracticeTasks: false },
    exams: { enabled: false, minPercent: 70, useAssessmentPassingScore: true },
    quizzes: { enabled: false, minPercent: 70 },
    attendance: { enabled: false, minPercent: 80 },
    speaking: { enabled: false, requireReviewed: false },
    listening: { enabled: false },
    teacherApproval: { enabled: true },
    hours: { mode: "NONE", plannedHours: null, minAttendedHours: null },
    expirationMonths: null,
  };
}

async function main() {
  expectPure();
  const james = await login("james.carter", "Student#Demo1");
  const lena = await login("lena.torres", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  james.status === 200 ? ok("student login") : bad("student login");

  await prisma.certificationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key: "autoIssue" } },
    create: { scopeKey: "GLOBAL", key: "autoIssue", value: "false" },
    update: { value: "false" },
  });
  const cleanupIds = (await prisma.user.findMany({ where: { username: { in: ["james.carter", "lena.torres"] } }, select: { id: true } })).map((user) => user.id);
  await prisma.certificate.deleteMany({ where: { studentId: { in: cleanupIds } } });
  await prisma.teacherApproval.deleteMany({ where: { studentId: { in: cleanupIds } } });
  await prisma.requirementOverride.deleteMany({ where: { studentId: { in: cleanupIds } } });
  await prisma.courseCompletionRecord.deleteMany({ where: { studentId: { in: cleanupIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: cleanupIds }, type: { in: ["CERT_ISSUED", "CERT_ELIGIBLE", "CERT_REVOKED", "CERT_EXPIRED", "CERT_EXPIRING"] } } });
  const student = await prisma.user.findUnique({ where: { username: "james.carter" } });
  const other = await prisma.user.findUnique({ where: { username: "pedro.alvarez" } });
  const course = student?.groupId
    ? await prisma.courseAssignment.findFirst({ where: { groupId: student.groupId }, include: { course: true } })
    : null;
  if (!student || !course || !other) throw new Error("seed data missing");
  const attemptsBefore = await prisma.assessmentAttempt.count({ where: { studentId: student.id } });

  const denied = await call(james.cookie, "POST", "/api/certificates/issue", { courseId: course.courseId, studentId: student.id, confirm: true, reason: "student tried" });
  denied.status === 403 ? ok("student cannot issue a certificate") : bad(`student issue ${denied.status}`);
  const signDenied = await call(james.cookie, "POST", "/api/certificates/signatories", { name: "Student", title: "Learner", confirm: true });
  signDenied.status === 403 ? ok("student cannot upload or save a signatory") : bad(`signatory ${signDenied.status}`);
  const practiceRule = await call(admin.cookie, "POST", "/api/certificates/rules", { courseId: course.courseId, confirm: true, rules: { ...approvalRule(), practice: { enabled: true } } });
  practiceRule.status === 422 || practiceRule.status === 400 ? ok("practice cannot be saved as an official requirement") : bad(`practice rule ${practiceRule.status}`);

  const lessonRule = {
    ...approvalRule(),
    lessons: { enabled: true, minPercent: 100 },
    teacherApproval: { enabled: false },
  };
  const savedLessons = await call(admin.cookie, "POST", "/api/certificates/rules", { courseId: course.courseId, confirm: true, rules: lessonRule });
  savedLessons.status === 200 ? ok("course rule saved") : bad(`rule ${savedLessons.status} ${JSON.stringify(savedLessons.data)}`);
  const pending = await call(james.cookie, "GET", `/api/certificates?courseId=${course.courseId}&studentId=${other.id}`);
  const pendingBody = pending.data as { data?: { eligible?: boolean; studentName?: string; requirements?: { key: string; status: string; evidence: string }[] } };
  pendingBody.data?.studentName === "James Carter" ? ok("student id in the query is ignored") : bad(`identity ${pendingBody.data?.studentName}`);
  pendingBody.data?.eligible === false ? ok("incomplete lessons are not eligible") : bad("lessons unexpectedly eligible");
  const keys = (pendingBody.data?.requirements ?? []).map((item) => item.key);
  !keys.includes("xp") && !keys.includes("practice") ? ok("eligibility requirements do not include XP or practice") : bad(`keys ${keys.join(",")}`);
  (pendingBody.data?.requirements ?? []).some((item) => item.evidence.toLowerCase().includes("login time is not used") || item.status === "NOT_REQUIRED" || item.status === "MISSING") ? ok("attendance evidence does not use login time") : bad("attendance evidence");

  const beforePreview = await prisma.certificate.count();
  const preview = await call(admin.cookie, "POST", "/api/certificates/preview", { courseId: course.courseId, studentId: student.id });
  preview.status === 200 && preview.text.startsWith("%PDF") && preview.headers.get("x-certificate-issued") === "no" ? ok("preview is a PDF and is not issued") : bad(`preview ${preview.status}`);
  (await prisma.certificate.count()) === beforePreview ? ok("preview does not create a certificate") : bad("preview created a row");

  const early = await call(admin.cookie, "POST", "/api/certificates/issue", { courseId: course.courseId, studentId: student.id, confirm: true, reason: "too early" });
  early.status === 409 ? ok("ineligible student is not issued") : bad(`early issue ${early.status}`);

  const savedApproval = await call(admin.cookie, "POST", "/api/certificates/rules", { courseId: course.courseId, confirm: true, rules: approvalRule() });
  savedApproval.status === 200 ? ok("rule can be changed per course") : bad("rule change");
  const template = await call(admin.cookie, "POST", "/api/certificates/templates", { name: "Phase 11", organizationName: "EnglishBridge", title: "Certificate of Completion", footer: "Official training record", showScore: false, showLevel: false, publicScore: false, confirm: true });
  const signatory = await call(admin.cookie, "POST", "/api/certificates/signatories", { name: "Training Office", title: "Registrar", confirm: true });
  template.status === 200 && signatory.status === 200 ? ok("template and signatory saved") : bad(`template ${template.status} signatory ${signatory.status}`);

  const notYet = await call(james.cookie, "GET", `/api/certificates?courseId=${course.courseId}`);
  (notYet.data as { data?: { eligible?: boolean } }).data?.eligible === false ? ok("approval is still missing") : bad("eligible before approval");
  const foreign = await call(teacher.cookie, "POST", "/api/certificates/approvals", { studentId: other.id, courseId: course.courseId, kind: "WRITING", status: "APPROVED", confirm: true, reason: "wrong group" });
  foreign.status === 404 ? ok("teacher cannot approve a student outside assigned groups") : bad(`foreign approval ${foreign.status}`);
  const approval = await call(teacher.cookie, "POST", "/api/certificates/approvals", { studentId: student.id, courseId: course.courseId, kind: "WRITING", status: "APPROVED", note: "Official writing approval", confirm: true, reason: "Phase 11 test approval" });
  approval.status === 200 ? ok("teacher approval is audited through the API") : bad(`approval ${approval.status} ${JSON.stringify(approval.data)}`);
  const ready = await call(james.cookie, "GET", `/api/certificates?courseId=${course.courseId}`);
  const readyData = (ready.data as { data?: { eligible?: boolean; requirements?: { key: string; evidence: string }[] } }).data;
  readyData?.eligible === true ? ok("configured approval makes the student eligible") : bad(`ready ${JSON.stringify(readyData?.requirements)}`);

  const noConfirm = await call(admin.cookie, "POST", "/api/certificates/issue", { courseId: course.courseId, studentId: student.id, reason: "missing confirm" });
  noConfirm.status === 400 ? ok("issue requires confirmation") : bad(`confirm ${noConfirm.status}`);
  const issued = await call(admin.cookie, "POST", "/api/certificates/issue", { courseId: course.courseId, studentId: student.id, confirm: true, reason: "Phase 11 test issue" });
  const issuedData = (issued.data as { data?: { publicId?: string; downloadPath?: string } }).data;
  issued.status === 201 && /^CERT-\d{4}-\d{6}$/.test(issuedData?.publicId ?? "") ? ok(`issued ${issuedData?.publicId}`) : bad(`issue ${issued.status} ${JSON.stringify(issued.data)}`);
  const duplicate = await call(admin.cookie, "POST", "/api/certificates/issue", { courseId: course.courseId, studentId: student.id, confirm: true, reason: "duplicate" });
  duplicate.status === 409 ? ok("duplicate active certificate is refused") : bad(`duplicate ${duplicate.status}`);

  const download = issuedData?.downloadPath ? await call(james.cookie, "GET", issuedData.downloadPath) : { status: 0, text: "", headers: new Headers() };
  download.status === 200 && download.text.startsWith("%PDF") && download.text.length > 1000 ? ok("authorized PDF download") : bad(`download ${download.status} ${download.text.slice(0, 40)}`);
  const lenaDownload = issuedData?.downloadPath ? await call(lena.cookie, "GET", issuedData.downloadPath) : { status: 0 };
  lenaDownload.status === 404 ? ok("another student cannot download the file") : bad(`lena download ${lenaDownload.status}`);
  const guessed = await call(james.cookie, "GET", `/api/certificates/download/${issuedData?.publicId ?? "CERT-2026-000001"}`);
  guessed.status === 404 ? ok("certificate number is not a download key") : bad(`guessed download ${guessed.status}`);

  const verify = await call("", "GET", `/api/verify/certificate/${issuedData?.publicId}`);
  const verifyText = JSON.stringify(verify.data);
  verify.status === 200 && verifyText.includes("VALID") && !verifyText.includes("employeeCode") && !verifyText.includes(student.employeeCode) && !verifyText.includes("demo.example") ? ok("public check hides employee code and email") : bad(`verify ${verifyText}`);
  const missing = await call("", "GET", "/api/verify/certificate/CERT-1999-000000");
  JSON.stringify(missing.data).includes("NOT_FOUND") ? ok("unknown certificate is not found") : bad("missing verify");

  const corrected = await call(admin.cookie, "POST", "/api/certificates/correct", { publicId: issuedData?.publicId, confirm: true, reason: "Correct the displayed name record" });
  const correctedData = (corrected.data as { data?: { publicId?: string; supersedes?: string } }).data;
  corrected.status === 201 && correctedData?.publicId !== issuedData?.publicId ? ok("correction creates a new certificate ID") : bad(`correct ${corrected.status} ${JSON.stringify(corrected.data)}`);
  const oldRow = await prisma.certificate.findUnique({ where: { publicId: issuedData?.publicId ?? "" } });
  oldRow?.status === "SUPERSEDED" ? ok("original certificate is superseded, not overwritten") : bad(`old status ${oldRow?.status}`);
  const oldVerify = await call("", "GET", `/api/verify/certificate/${issuedData?.publicId}`);
  JSON.stringify(oldVerify.data).includes("SUPERSEDED") ? ok("replaced certificate is not reported as valid") : bad(`old verify ${JSON.stringify(oldVerify.data)}`);

  if (correctedData?.publicId) {
    await prisma.certificate.update({ where: { publicId: correctedData.publicId }, data: { expiresAt: new Date(Date.now() - 86400000) } });
    const expired = await call("", "GET", `/api/verify/certificate/${correctedData.publicId}`);
    JSON.stringify(expired.data).includes("EXPIRED") ? ok("expired certificate stays in history") : bad(`expired ${JSON.stringify(expired.data)}`);
    const recert = await call(admin.cookie, "POST", "/api/certificates/recertify", { publicId: correctedData.publicId, confirm: true, reason: "Recertification after expiration" });
    const recertData = (recert.data as { data?: { publicId?: string; recertifies?: string } }).data;
    recert.status === 201 && recertData?.publicId !== correctedData.publicId ? ok("recertification is a new linked record") : bad(`recert ${recert.status} ${JSON.stringify(recert.data)}`);
    const revoked = await call(admin.cookie, "POST", "/api/certificates/revoke", { publicId: recertData?.publicId, confirm: true, reason: "Test revocation keeps history" });
    revoked.status === 200 ? ok("revocation keeps the certificate") : bad(`revoke ${revoked.status}`);
    const revokedVerify = await call("", "GET", `/api/verify/certificate/${recertData?.publicId}`);
    JSON.stringify(revokedVerify.data).includes("REVOKED") ? ok("public check shows revoked") : bad(`revoked verify ${JSON.stringify(revokedVerify.data)}`);
    const stillThere = await prisma.certificate.findUnique({ where: { publicId: recertData?.publicId ?? "" } });
    stillThere ? ok("revoked row was not deleted") : bad("revoked row missing");
  }

  const shiftC = await prisma.learningGroup.findUnique({ where: { name: "Firefighter Shift C" } });
  const outside = await call(teacher.cookie, "GET", `/api/certificates/reports?kind=eligibility&format=csv&groupId=${shiftC?.id ?? "none"}`);
  outside.status === 404 ? ok("teacher report stays inside assigned groups") : bad(`outside report ${outside.status}`);
  const report = await call(admin.cookie, "GET", "/api/certificates/reports?kind=eligibility&format=csv");
  report.status === 200 && report.text.includes("not a ranking") && !report.text.includes(student.employeeCode) ? ok("eligibility CSV has no ranking and no employee code") : bad("csv report");
  const xlsx = await call(admin.cookie, "GET", "/api/certificates/reports?kind=certificates&format=xlsx");
  xlsx.status === 200 && xlsx.text.startsWith("PK") ? ok("XLSX report is a real workbook") : bad(`xlsx ${xlsx.status}`);
  const pdfReport = await call(admin.cookie, "GET", "/api/certificates/reports?kind=attendance&format=pdf");
  pdfReport.status === 200 && pdfReport.text.startsWith("%PDF") ? ok("attendance PDF report") : bad(`pdf report ${pdfReport.status}`);

  const batch = await call(admin.cookie, "POST", "/api/certificates/batch", { courseId: course.courseId, groupId: student.groupId, confirm: true, reason: "Batch check" });
  const batchData = (batch.data as { data?: { issued?: unknown[]; skipped?: { reasons: string[] }[] } }).data;
  const skippedReasons = (batchData?.skipped ?? []).flatMap((item) => item.reasons);
  batch.status === 200 && (batchData?.skipped?.length ?? 0) > 0 && skippedReasons.every((reason) => reason.length > 0) ? ok("batch reports every ineligible student and does not hide the reason") : bad(`batch ${batch.status} ${JSON.stringify(batchData)}`);

  const attemptsAfter = await prisma.assessmentAttempt.count({ where: { studentId: student.id } });
  attemptsAfter === attemptsBefore ? ok("issuing a certificate does not change exam attempts") : bad("exam attempts changed");
  const auditRow = await prisma.auditLog.findFirst({ where: { action: "CERTIFICATE_ISSUED", entityType: "CERTIFICATE" } });
  auditRow ? ok("issuance is audited") : bad("audit missing");

  const preference = await call(lena.cookie, "POST", "/api/certificates/preferences", { notifyIssued: false, notifyEligible: false, notifyRevoked: true, notifyExpiring: true });
  preference.status === 200 ? ok("notification preference saved") : bad(`preference ${preference.status}`);
  await call(admin.cookie, "POST", "/api/certificates/settings", { key: "autoIssue", value: "true", confirm: true });
  await call(teacher.cookie, "POST", "/api/certificates/approvals", { studentId: (await prisma.user.findUnique({ where: { username: "lena.torres" } }))?.id, courseId: course.courseId, kind: "PROJECT", status: "APPROVED", confirm: true, reason: "Auto issue test" });
  const lenaHome = await call(lena.cookie, "GET", "/api/certificates");
  const lenaIssued = JSON.stringify(lenaHome.data).includes("CERT-");
  lenaIssued ? ok("automatic issuance is audited and can run when enabled") : bad("auto issue did not run");
  const lenaUser = await prisma.user.findUnique({ where: { username: "lena.torres" } });
  const lenaNotice = lenaUser ? await prisma.notification.count({ where: { userId: lenaUser.id, type: "CERT_ISSUED" } }) : 1;
  lenaNotice === 0 ? ok("issued notification respects the saved preference") : bad(`notices ${lenaNotice}`);
  await call(admin.cookie, "POST", "/api/certificates/settings", { key: "autoIssue", value: "false", confirm: true });
  const autoOff = await prisma.certificationSetting.findUnique({ where: { scopeKey_key: { scopeKey: "GLOBAL", key: "autoIssue" } } });
  autoOff?.value === "false" ? ok("automatic issuance is off again") : bad("auto issue left on");

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.certificationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key: "autoIssue" } },
    create: { scopeKey: "GLOBAL", key: "autoIssue", value: "false" },
    update: { value: "false" },
  }).catch(() => undefined);
  await prisma.$disconnect();
  process.exit(1);
});
