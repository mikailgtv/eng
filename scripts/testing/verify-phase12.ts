/**
 * Phase 12 communication checks.
 * Probe records are removed at the end. Official audit rows are left in place.
 */
import { readFileSync, unlinkSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { inQuietHours, renderTemplate, validateTemplate, formatInZone } from "../../src/lib/communication/rules";
import { sanitizeMessage, safeLink } from "../../src/lib/communication/sanitize";
import { emailProvider, smsProvider, pushProvider, channelStatus } from "../../src/lib/communication/providers";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (message: string) => { pass += 1; console.log(`  ✓ ${message}`); };
const bad = (message: string) => { fail += 1; console.log(`  ✗ ${message}`); };
const probeTitles: string[] = [];
const conversationIds: string[] = [];
const announcementIds: string[] = [];
const sessionIds: string[] = [];
const templateKeys: string[] = [];
const attachmentFiles: string[] = [];

function expectPure() {
  inQuietHours(new Date("2026-09-30T23:30:00Z"), "22:00", "07:00", "UTC") ? ok("quiet hours wrap past midnight") : bad("quiet hours wrap");
  !inQuietHours(new Date("2026-09-30T12:00:00Z"), "22:00", "07:00", "UTC") ? ok("midday is outside quiet hours") : bad("quiet hours daytime");
  !inQuietHours(new Date("2026-09-30T23:30:00Z"), "bad", "07:00", "UTC") ? ok("invalid quiet hours do not suppress") : bad("invalid quiet hours");
  validateTemplate("Hello {{student_name}}", "Due {{due_date}}") === null ? ok("known template variables pass") : bad("template variables");
  validateTemplate("Hello {{secret}}", "Subject")?.includes("Unknown variable") ? ok("unknown template variable is rejected") : bad("unknown variable");
  validateTemplate("<b>Hi</b>", "Subject")?.includes("plain text") ? ok("template HTML is rejected") : bad("template html");
  renderTemplate("Hi {{ student_name }}", { student_name: "James" }) === "Hi James" ? ok("template render") : bad("template render");
  sanitizeMessage("<script>alert(1)</script>Hello") === "alert(1)Hello" ? ok("message HTML is stripped") : bad("sanitize");
  safeLink("javascript:alert(1)") === null && safeLink("/student/schedule") === "/student/schedule" ? ok("unsafe links are dropped") : bad("safe link");
  formatInZone(new Date("2026-09-30T12:00:00Z"), "UTC").includes("UTC") ? ok("display includes the timezone name") : bad("timezone label");
  formatInZone(new Date("2026-09-30T12:00:00Z"), "Asia/Tehran") !== formatInZone(new Date("2026-09-30T12:00:00Z"), "UTC") ? ok("display follows the requested zone") : bad("zone difference");
  !emailProvider().configured && !smsProvider().configured && !pushProvider().configured ? ok("email, push, and SMS are unconfigured by default") : bad("providers configured unexpectedly");
  channelStatus().email.detail.toLowerCase().includes("not configured") ? ok("channel status does not claim delivery") : bad("channel status");
}

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier, password }),
  });
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

async function call(cookie: string, method: string, route: string, body?: unknown) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { Origin: BASE, Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, text };
}

function unwrap(data: unknown): any {
  if (data && typeof data === "object" && "data" in data) return (data as { data: unknown }).data;
  return data;
}

async function main() {
  expectPure();
  const james = await login("james.carter", "Student#Demo1");
  const lena = await login("lena.torres", "Student#Demo1");
  const pedro = await login("pedro.alvarez", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  james.status === 200 && teacher.status === 200 && admin.status === 200 ? ok("demo logins still work") : bad("demo logins");

  const open = await call("", "GET", "/api/communication/notifications");
  open.status === 401 ? ok("notification API requires a session") : bad(`notification API auth ${open.status}`);
  const openMessage = await call("", "POST", "/api/messages", { recipientId: "x", body: "hello" });
  openMessage.status === 401 ? ok("message API requires a session") : bad(`message API auth ${openMessage.status}`);

  const jamesUser = await prisma.user.findUnique({ where: { username: "james.carter" } });
  const lenaUser = await prisma.user.findUnique({ where: { username: "lena.torres" } });
  const pedroUser = await prisma.user.findUnique({ where: { username: "pedro.alvarez" } });
  const sara = await prisma.user.findUnique({ where: { username: "sara.whitfield" } });
  const shiftA = await prisma.learningGroup.findFirst({ where: { name: { contains: "Shift A" } } });
  const shiftC = await prisma.learningGroup.findFirst({ where: { name: { contains: "Shift C" } } });
  if (!jamesUser || !lenaUser || !pedroUser || !sara || !shiftA || !shiftC) {
    bad("demo users or shifts are missing");
    return;
  }

  const studentToStudent = await call(james.cookie, "POST", "/api/messages", { recipientId: lenaUser.id, body: "Private note from another student" });
  studentToStudent.status === 404 ? ok("student-to-student messages are off") : bad(`student-to-student ${studentToStudent.status}`);
  const wrongShift = await call(teacher.cookie, "POST", "/api/messages", { recipientId: pedroUser.id, body: "Should not reach another shift" });
  wrongShift.status === 404 ? ok("teacher cannot message an unassigned shift") : bad(`cross-shift teacher message ${wrongShift.status}`);

  const sent = await call(james.cookie, "POST", "/api/messages", { recipientId: sara.id, body: "Phase12 probe: can I review the schedule?" });
  const sentData = unwrap(sent.data);
  sent.status === 201 && sentData?.conversationId ? ok("student can message the assigned teacher") : bad(`assigned teacher message ${sent.status}`);
  if (sentData?.conversationId) conversationIds.push(sentData.conversationId);

  const xss = await call(james.cookie, "POST", "/api/messages", { recipientId: sara.id, body: "<script>alert(1)</script>Phase12 probe plain text" });
  const stored = xss.status === 201 ? await prisma.message.findUnique({ where: { id: unwrap(xss.data).messageId } }) : null;
  stored && !stored.body.includes("<script>") && stored.body.includes("Phase12 probe plain text") ? ok("stored messages are plain text") : bad("stored xss");

  const edited = stored ? await call(james.cookie, "POST", "/api/messages/edit", { id: stored.id, body: "Phase12 probe edited text", confirm: true }) : { status: 0 };
  const revision = stored ? await prisma.messageRevision.findFirst({ where: { messageId: stored.id } }) : null;
  edited.status === 200 && revision?.previousBody ? ok("edits keep the original text") : bad("message edit history");

  const pedroView = sentData?.conversationId ? await call(pedro.cookie, "GET", `/api/messages?conversation=${sentData.conversationId}`) : { status: 0 };
  pedroView.status === 404 ? ok("another student cannot open the conversation") : bad(`cross-student conversation ${pedroView.status}`);
  const searchJames = await call(james.cookie, "GET", "/api/messages/search?q=Phase12%20probe");
  const searchPedro = await call(pedro.cookie, "GET", "/api/messages/search?q=Phase12%20probe");
  Array.isArray(unwrap(searchJames.data)) && unwrap(searchJames.data).length > 0 ? ok("sender can search an authorized message") : bad("authorized search");
  Array.isArray(unwrap(searchPedro.data)) && unwrap(searchPedro.data).length === 0 ? ok("search does not cross students") : bad("cross-student search");
  const searchTo = await call(james.cookie, "GET", "/api/messages/search?to=Whitfield&category=MESSAGE");
  const searchOtherCategory = await call(james.cookie, "GET", "/api/messages/search?q=Phase12&category=EXAM");
  Array.isArray(unwrap(searchTo.data)) && unwrap(searchTo.data).length > 0 ? ok("search can use the recipient") : bad("recipient search");
  Array.isArray(unwrap(searchOtherCategory.data)) && unwrap(searchOtherCategory.data).length === 0 ? ok("message search stays in the message category") : bad("message category search");

  const receipt = await call(teacher.cookie, "GET", `/api/messages?conversation=${sentData.conversationId}`);
  const receiptText = JSON.stringify(unwrap(receipt.data) ?? {});
  receipt.status === 200 && receiptText.includes("Sent") && !receiptText.includes("\"readAt\":\"20") ? ok("read receipts stay off unless enabled") : bad("read receipts");

  if (sentData?.messageId) {
    const pdf = new Blob([Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")], { type: "application/pdf" });
    const form = new FormData();
    form.set("messageId", sentData.messageId);
    form.set("file", pdf, "phase12-note.pdf");
    const uploaded = await fetch(`${BASE}/api/messages/attachments`, { method: "POST", headers: { Origin: BASE, Cookie: james.cookie }, body: form });
    const uploadedJson = await uploaded.json().catch(() => null);
    const attachmentId = uploadedJson?.data?.id as string | undefined;
    uploaded.status === 201 && attachmentId ? ok("a real PDF attachment is stored") : bad(`pdf attachment ${uploaded.status}`);
    if (attachmentId) {
      const row = await prisma.messageAttachment.findUnique({ where: { id: attachmentId } });
      if (row) attachmentFiles.push(path.join("storage", "messages", row.storagePath));
      const owner = await fetch(`${BASE}/api/messages/attachments/${attachmentId}`, { headers: { Cookie: james.cookie } });
      const stranger = await fetch(`${BASE}/api/messages/attachments/${attachmentId}`, { headers: { Cookie: pedro.cookie } });
      owner.status === 200 && owner.headers.get("content-type")?.includes("pdf") ? ok("participant can download the file") : bad(`owner download ${owner.status}`);
      stranger.status === 404 ? ok("another student cannot download the file") : bad(`stranger download ${stranger.status}`);
    }
    const exe = new FormData();
    exe.set("messageId", sentData.messageId);
    exe.set("file", new Blob([Buffer.from("MZ")], { type: "application/octet-stream" }), "phase12.exe");
    const rejected = await fetch(`${BASE}/api/messages/attachments`, { method: "POST", headers: { Origin: BASE, Cookie: james.cookie }, body: exe });
    rejected.status === 400 ? ok("executable attachments are rejected") : bad(`executable upload ${rejected.status}`);
    const spoofed = new FormData();
    spoofed.set("messageId", sentData.messageId);
    spoofed.set("file", new Blob([Buffer.from("MZ")], { type: "application/pdf" }), "phase12.pdf");
    const spoof = await fetch(`${BASE}/api/messages/attachments`, { method: "POST", headers: { Origin: BASE, Cookie: james.cookie }, body: spoofed });
    spoof.status === 400 ? ok("file contents must match the type") : bad(`spoofed pdf ${spoof.status}`);
  }

  const groupSend = await call(teacher.cookie, "POST", "/api/messages", { groupId: shiftA.id, body: "Phase12 probe group note", confirm: true });
  const groupData = unwrap(groupSend.data);
  groupSend.status === 201 && Array.isArray(groupData?.sent) && groupData.sent.length > 0 ? ok("group send creates separate deliveries") : bad("group send");
  const shared = await prisma.conversation.findFirst({
    where: { messages: { some: { body: "Phase12 probe group note" } }, participants: { some: { userId: jamesUser.id } }, AND: [{ participants: { some: { userId: lenaUser.id } } }] },
  });
  !shared ? ok("group replies are not a shared student room") : bad("shared student room");
  const groupConversations = await prisma.conversation.findMany({ where: { messages: { some: { body: "Phase12 probe group note" } } }, select: { id: true } });
  conversationIds.push(...groupConversations.map((item) => item.id));

  const studentGroup = await call(james.cookie, "POST", "/api/messages", { groupId: shiftA.id, body: "Phase12 probe student broadcast", confirm: true });
  studentGroup.status === 403 ? ok("students cannot message a whole group") : bad(`student group send ${studentGroup.status}`);

  const urgent = await call(teacher.cookie, "POST", "/api/communication/announcements", {
    title: "Phase12 urgent probe",
    body: "This should be rejected.",
    announcementType: "INFORMATION",
    priority: "URGENT",
    publishAt: new Date().toISOString(),
    confirm: true,
    targets: [{ targetType: "GROUP", targetId: shiftA.id }],
  });
  urgent.status === 403 ? ok("teachers cannot mark a notice urgent") : bad(`teacher urgent ${urgent.status}`);

  const otherShift = await call(teacher.cookie, "POST", "/api/communication/announcements", {
    title: "Phase12 other shift probe",
    body: "This should be rejected.",
    announcementType: "INFORMATION",
    publishAt: new Date().toISOString(),
    confirm: true,
    targets: [{ targetType: "SHIFT", targetId: shiftC.id }],
  });
  otherShift.status === 403 || otherShift.status === 404 ? ok("teacher cannot announce to an unassigned shift") : bad(`unassigned announcement ${otherShift.status}`);

  const futureTitle = "Phase12 future probe";
  probeTitles.push(futureTitle);
  const future = await call(admin.cookie, "POST", "/api/communication/announcements", {
    title: futureTitle,
    body: "This stays hidden until the publish time.",
    announcementType: "INFORMATION",
    publishAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    confirm: true,
    targets: [{ targetType: "SHIFT", targetId: shiftA.id }],
  });
  if (unwrap(future.data)?.id) announcementIds.push(unwrap(future.data).id);
  const hidden = await call(james.cookie, "GET", "/api/communication/announcements");
  future.status === 201 && !JSON.stringify(unwrap(hidden.data) ?? []).includes(futureTitle) ? ok("scheduled announcements stay hidden") : bad("scheduled announcement");

  const shiftTitle = "Phase12 shift A probe";
  probeTitles.push(shiftTitle);
  const shiftNotice = await call(admin.cookie, "POST", "/api/communication/announcements", {
    title: shiftTitle,
    body: "Only Shift A should see this reminder.",
    announcementType: "REMINDER",
    publishAt: new Date().toISOString(),
    confirm: true,
    acknowledgementRequired: true,
    targets: [{ targetType: "SHIFT", targetId: shiftA.id }],
  });
  if (unwrap(shiftNotice.data)?.id) announcementIds.push(unwrap(shiftNotice.data).id);
  const jamesAnn = await call(james.cookie, "GET", "/api/communication/announcements");
  const pedroAnn = await call(pedro.cookie, "GET", "/api/communication/announcements");
  JSON.stringify(unwrap(jamesAnn.data) ?? []).includes(shiftTitle) ? ok("targeted shift sees the announcement") : bad("shift announcement visible");
  !JSON.stringify(unwrap(pedroAnn.data) ?? []).includes(shiftTitle) ? ok("another shift does not see it") : bad("shift leak");
  const beforeAck = JSON.stringify(unwrap(jamesAnn.data) ?? []);
  beforeAck.includes("Acknowledgement") || beforeAck.includes("acknowledged\":false") ? ok("opening does not count as acknowledgement") : bad("acknowledgement distinct");
  const ack = await call(james.cookie, "POST", "/api/communication/announcements/acknowledge", { id: unwrap(shiftNotice.data)?.id, confirm: true });
  ack.status === 200 ? ok("explicit acknowledgement is stored") : bad(`acknowledge ${ack.status}`);
  const pedroAck = await call(pedro.cookie, "POST", "/api/communication/announcements/acknowledge", { id: unwrap(shiftNotice.data)?.id, confirm: true });
  pedroAck.status === 404 ? ok("unrelated student cannot acknowledge it") : bad(`cross acknowledge ${pedroAck.status}`);

  const preview = await call(admin.cookie, "POST", "/api/communication/templates", { subject: "Hello", body: "Hi {{student_name}}", preview: true });
  unwrap(preview.data)?.preview === "Hi Student" ? ok("template preview uses sample values") : bad("template preview");
  const badTemplate = await call(admin.cookie, "POST", "/api/communication/templates", { subject: "Hello", body: "Hi {{password}}", confirm: true, key: "phase12.bad", name: "Bad", category: "ADMIN" });
  badTemplate.status === 400 ? ok("template activation checks variables") : bad(`bad template ${badTemplate.status}`);
  const template = await call(admin.cookie, "POST", "/api/communication/templates", {
    key: "phase12.probe",
    name: "Phase 12 probe",
    category: "ASSIGNMENT",
    subject: "Assignment {{assignment_name}}",
    body: "Hello {{student_name}}",
    active: false,
    confirm: true,
  });
  template.status === 200 ? ok("inactive template can be saved") : bad(`template save ${template.status}`);
  templateKeys.push("phase12.probe");
  const revised = await call(admin.cookie, "POST", "/api/communication/templates", {
    key: "phase12.probe",
    name: "Phase 12 probe",
    category: "ASSIGNMENT",
    subject: "Updated {{assignment_name}}",
    body: "Hello {{student_name}}",
    active: false,
    confirm: true,
  });
  const versions = await prisma.notificationTemplateVersion.count({ where: { template: { key: "phase12.probe" } } });
  revised.status === 200 && versions >= 1 ? ok("template edits keep a version") : bad("template version");

  const rules = await call(admin.cookie, "GET", "/api/communication/rules");
  const ruleList = unwrap(rules.data) as { eventKey: string; enabled: boolean }[];
  Array.isArray(ruleList) && ruleList.some((rule) => rule.eventKey === "ai.ready" && rule.enabled === false) ? ok("AI notices stay disabled") : bad("ai rule");
  const studentRules = await call(james.cookie, "POST", "/api/communication/rules", { eventKey: "ai.ready", enabled: true, confirm: true });
  studentRules.status === 401 || studentRules.status === 403 ? ok("students cannot change rules") : bad(`student rule change ${studentRules.status}`);

  const devices = await call(james.cookie, "GET", "/api/communication/devices");
  const deviceText = JSON.stringify(devices.data ?? {});
  !deviceText.toLowerCase().includes("private") && !deviceText.includes("SMTP") ? ok("device endpoint does not expose provider secrets") : bad("provider secret exposure");

  const prefOff = await call(james.cookie, "POST", "/api/communication/preferences", { category: "GAMIFICATION", inApp: false, email: false, push: false, sms: false });
  prefOff.status === 200 ? ok("motivational notices can be turned off") : bad(`preference ${prefOff.status}`);
  const officialOff = await call(james.cookie, "POST", "/api/communication/preferences", { category: "EXAM", inApp: false, email: true, push: false, sms: true });
  const examPref = await prisma.notificationPreference.findUnique({ where: { userId_category: { userId: jamesUser.id, category: "EXAM" } } });
  officialOff.status === 200 && examPref?.inApp === true && examPref.sms === true ? ok("official exam notices stay in the app") : bad("official preference override");

  const { publishNotification } = await import("../../src/lib/communication/hub");
  const grouped = await publishNotification({ userIds: [jamesUser.id], type: "SYSTEM", category: "GAMIFICATION", title: "Phase12 grouped probe", body: "One", groupKey: "phase12-group-probe" });
  const groupedAgain = await publishNotification({ userIds: [jamesUser.id], type: "SYSTEM", category: "GAMIFICATION", title: "Phase12 grouped probe", body: "Two", groupKey: "phase12-group-probe" });
  const groupedRow = await prisma.notification.findFirst({ where: { userId: jamesUser.id, groupKey: "phase12-group-probe" } });
  grouped.created === 0 && grouped.suppressed >= 1 ? ok("disabled motivational category is not stored") : bad("gamification preference");
  await prisma.notificationPreference.update({ where: { userId_category: { userId: jamesUser.id, category: "GAMIFICATION" } }, data: { inApp: true } });
  const created = await publishNotification({ userIds: [jamesUser.id], type: "SYSTEM", category: "GAMIFICATION", title: "Phase12 grouped probe", body: "One", groupKey: "phase12-group-probe" });
  const createdAgain = await publishNotification({ userIds: [jamesUser.id], type: "SYSTEM", category: "GAMIFICATION", title: "Phase12 grouped probe", body: "Two", groupKey: "phase12-group-probe" });
  const groupedAfter = await prisma.notification.findFirst({ where: { userId: jamesUser.id, groupKey: "phase12-group-probe" } });
  created.created === 1 && createdAgain.grouped === 1 && groupedAfter && groupedAfter.eventCount >= 2 ? ok("similar notices are grouped") : bad(`grouping ${created.created}/${createdAgain.grouped}`);
  probeTitles.push("Phase12 grouped probe");
  void groupedAgain;
  void groupedRow;

  const capBefore = await prisma.notification.count({ where: { userId: jamesUser.id, critical: false, createdAt: { gte: new Date(Date.now() - 3600000) } } });
  await prisma.communicationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key: "notificationHourlyCap" } },
    create: { scopeKey: "GLOBAL", key: "notificationHourlyCap", value: String(capBefore) },
    update: { value: String(capBefore) },
  });
  const limited = await publishNotification({ userIds: [jamesUser.id], type: "SYSTEM", category: "SYSTEM", title: "Phase12 cap probe", body: "Too many", groupKey: `phase12-cap-${Date.now()}` });
  limited.suppressed === 1 ? ok("hourly cap suppresses non-critical notices") : bad(`rate limit ${limited.suppressed}`);
  await prisma.communicationSetting.deleteMany({ where: { key: "notificationHourlyCap" } });

  await prisma.communicationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key: "emailEnabled" } },
    create: { scopeKey: "GLOBAL", key: "emailEnabled", value: "true" },
    update: { value: "true" },
  });
  await prisma.communicationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key: "pushEnabled" } },
    create: { scopeKey: "GLOBAL", key: "pushEnabled", value: "true" },
    update: { value: "true" },
  });
  const emailPref = await call(james.cookie, "POST", "/api/communication/preferences", {
    category: "SYSTEM",
    inApp: true,
    email: true,
    push: true,
    sms: true,
    quietStart: "00:00",
    quietEnd: "23:59",
  });
  const external = await publishNotification({ userIds: [jamesUser.id], type: "SYSTEM", category: "SYSTEM", title: "Phase12 channel probe", body: "In app only", groupKey: `phase12-channel-${Date.now()}` });
  const deliveries = external.created === 1
    ? await prisma.notificationDelivery.findMany({ where: { userId: jamesUser.id, notification: { title: "Phase12 channel probe" } } })
    : [];
  const emailRow = deliveries.find((row) => row.channel === "EMAIL");
  const inAppRow = deliveries.find((row) => row.channel === "IN_APP");
  emailPref.status === 200 && inAppRow?.status === "DELIVERED" && emailRow?.status === "FAILED" && !deliveries.some((row) => row.status === "DELIVERED" && row.channel !== "IN_APP")
    ? ok("failed email keeps the in-app notice and does not claim delivery")
    : bad("delivery status");
  probeTitles.push("Phase12 channel probe");
  deliveries.some((row) => row.channel === "SMS") ? bad("SMS was attempted for a non-urgent notice") : ok("SMS is not used for routine notices");

  const session = await prisma.classSession.create({
    data: {
      groupId: shiftA.id,
      teacherId: sara.id,
      title: "Phase12 shift reminder probe",
      scheduledStart: new Date(Date.now() + 10 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 70 * 60 * 1000),
      status: "SCHEDULED",
    },
  });
  sessionIds.push(session.id);
  const sweep = await call(admin.cookie, "POST", "/api/communication/reminders");
  const studentSweep = await call(james.cookie, "POST", "/api/communication/reminders");
  sweep.status === 200 ? ok("an administrator can run due reminders") : bad(`reminder sweep ${sweep.status}`);
  studentSweep.status === 401 || studentSweep.status === 403 ? ok("students cannot run the reminder sweep") : bad(`student sweep ${studentSweep.status}`);
  const jamesReminder = await prisma.notification.findFirst({ where: { userId: jamesUser.id, relatedId: session.id, title: "Class starting soon" } });
  const pedroReminder = await prisma.notification.findFirst({ where: { userId: pedroUser.id, relatedId: session.id } });
  jamesReminder && !pedroReminder ? ok("class reminder stays inside the scheduled shift") : bad("shift reminder");
  await call(admin.cookie, "POST", "/api/communication/reminders");
  const shiftStudents = await prisma.user.count({ where: { groupId: shiftA.id, role: "STUDENT", status: "ACTIVE" } });
  const reminderCount = await prisma.notification.count({ where: { relatedId: session.id, title: "Class starting soon" } });
  reminderCount === shiftStudents ? ok("the same class reminder is not sent again") : bad(`duplicate reminder ${reminderCount}`);

  const cancelled = await call(teacher.cookie, "POST", `/api/teaching/sessions/${session.id}`, { action: "cancel" });
  const cancelNotice = await prisma.notification.findFirst({ where: { userId: jamesUser.id, relatedId: session.id, title: "Class cancelled" } });
  const pedroCancel = await prisma.notification.findFirst({ where: { userId: pedroUser.id, relatedId: session.id, title: "Class cancelled" } });
  cancelled.status === 200 && cancelNotice && !pedroCancel ? ok("cancelling a class notifies only that group") : bad("cancel notice");

  const pages = [
    "/student/notifications",
    "/student/messages",
    "/student/announcements",
    "/student/notifications/preferences",
    "/student/certificates",
    "/student/achievements",
    "/student/exams",
    "/student/schedule",
    "/teacher/notifications",
    "/teacher/messages",
    "/admin/notifications",
    "/admin/announcements",
    "/admin/messages",
  ];
  let pageOk = true;
  for (const page of pages) {
    const cookie = page.startsWith("/teacher") ? teacher.cookie : page.startsWith("/admin") ? admin.cookie : james.cookie;
    const res = await fetch(`${BASE}${page}`, { headers: { Cookie: cookie } });
    if (res.status !== 200) pageOk = false;
    if (page === "/student/notifications") {
      const html = await res.text();
      html.includes("unread") && html.includes("Mark as read") && html.includes("max-w-lg") ? ok("student notification page is text-labeled and mobile width") : bad("mobile notification page");
    }
  }
  pageOk ? ok("notification, message, and Phase 1–11 pages load") : bad("page regression");

  const columns = await prisma.$queryRawUnsafe<{ name: string }[]>("PRAGMA table_info(notifications)");
  ["category", "priority", "archivedAt", "groupKey", "acknowledgementRequired"].every((name) => columns.some((column) => column.name === name))
    ? ok("notification table was extended in place")
    : bad("notification migration");
  await prisma.scheduledNotice.findFirst() !== undefined ? ok("scheduled notice table exists") : bad("scheduled notice table");
}

async function cleanup() {
  if (announcementIds.length) {
    await prisma.notification.deleteMany({ where: { relatedId: { in: announcementIds } } });
    await prisma.scheduledNotice.deleteMany({ where: { relatedId: { in: announcementIds } } });
    await prisma.announcement.deleteMany({ where: { id: { in: announcementIds } } });
  }
  if (probeTitles.length) await prisma.notification.deleteMany({ where: { title: { in: probeTitles } } });
  if (sessionIds.length) {
    await prisma.notification.deleteMany({ where: { relatedId: { in: sessionIds } } });
    await prisma.scheduledNotice.deleteMany({ where: { relatedId: { in: sessionIds } } });
    await prisma.classSession.deleteMany({ where: { id: { in: sessionIds } } });
  }
  if (conversationIds.length) {
    await prisma.notification.deleteMany({ where: { relatedId: { in: conversationIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }
  await prisma.message.deleteMany({ where: { body: { contains: "Phase12 probe" } } });
  if (templateKeys.length) await prisma.notificationTemplate.deleteMany({ where: { key: { in: templateKeys } } });
  await prisma.communicationSetting.deleteMany({ where: { key: { in: ["notificationHourlyCap", "emailEnabled", "pushEnabled"] } } });
  const jamesUser = await prisma.user.findUnique({ where: { username: "james.carter" }, select: { id: true } });
  if (jamesUser) {
    await prisma.notificationPreference.deleteMany({ where: { userId: jamesUser.id, category: { in: ["GAMIFICATION", "SYSTEM", "EXAM"] } } });
    await prisma.communicationPreference.deleteMany({ where: { userId: jamesUser.id } });
  }
  for (const file of attachmentFiles) {
    try { unlinkSync(file); } catch { /* already removed */ }
  }
}

main()
  .catch((err) => {
    fail += 1;
    console.error(err);
  })
  .finally(async () => {
    await cleanup().catch((err) => console.error("cleanup", err));
    console.log(`\n${pass} passed, ${fail} failed`);
    await prisma.$disconnect();
    process.exit(fail > 0 ? 1 : 0);
  });
