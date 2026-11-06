/**
 * Certificate issuance, revocation, correction, and views.
 * Identity fields are inserted once. Later changes create a new certificate.
 */
import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { fullName } from "@/lib/utils";
import { notifyUsers } from "@/lib/teaching/notify";
import { assertGroupAccess, assignedGroupIds } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";
import { configuredAppOrigin, visibleStudent } from "@/lib/certificates/access";
import { evaluateCourse, persistEvaluation, type Evaluation } from "@/lib/certificates/engine";
import { renderCertificatePdf, type CertificateSnapshot } from "@/lib/certificates/pdf";
import {
  EMPTY_RULES,
  STATUS_DEFINITIONS,
  assertNumberingPattern,
  formatCertificateId,
  officialDateTime,
  orgYear,
  parseCompletionRules,
  ruleSummary,
  type CompletionRules,
} from "@/lib/certificates/rules";

const SETTING_DEFAULTS: Record<string, string> = {
  autoIssue: "false",
  numberingPattern: "CERT-{YEAR}-{SEQUENCE}",
  numberingPrefix: "CERT",
  sequenceWidth: "6",
  organizationName: "EnglishBridge",
  requireSignature: "true",
  expiryWarningDays: "30",
};

export async function loadSettings() {
  const rows = await prisma.certificationSetting.findMany({ where: { scopeKey: "GLOBAL" } });
  const values = { ...SETTING_DEFAULTS };
  for (const row of rows) values[row.key] = row.value;
  return {
    autoIssue: values.autoIssue === "true",
    pattern: values.numberingPattern,
    prefix: values.numberingPrefix,
    width: Number(values.sequenceWidth) || 6,
    organizationName: values.organizationName,
    requireSignature: values.requireSignature !== "false",
    expiryWarningDays: Number(values.expiryWarningDays) || 30,
    raw: values,
  };
}

export async function expireDueCertificates() {
  const now = new Date();
  const due = await prisma.certificate.findMany({
    where: { status: "ISSUED", expiresAt: { lt: now } },
    select: { id: true, publicId: true, studentId: true },
  });
  for (const certificate of due) {
    await prisma.certificate.update({ where: { id: certificate.id }, data: { status: "EXPIRED" } });
    await audit({
      actorId: null,
      action: "CERTIFICATE_EXPIRED",
      entityType: "CERTIFICATE",
      entityId: certificate.id,
      metadata: { publicId: certificate.publicId },
    });
    await notifyCertificate(certificate.studentId, "expiring", {
      type: "CERT_EXPIRED",
      title: "Certificate expired",
      body: `${certificate.publicId} is past its expiration date. The record is kept.`,
      href: "/student/certificates",
    });
  }
  const settings = await loadSettings();
  const soon = new Date(now.getTime() + settings.expiryWarningDays * 24 * 60 * 60 * 1000);
  const expiring = await prisma.certificate.findMany({
    where: { status: "ISSUED", expiresAt: { gte: now, lte: soon } },
    select: { publicId: true, studentId: true, expiresAt: true },
  });
  for (const certificate of expiring) {
    await notifyCertificate(certificate.studentId, "expiring", {
      type: "CERT_EXPIRING",
      title: "Certificate expiration date is near",
      body: `${certificate.publicId} expires on ${certificate.expiresAt ? officialDateTime(certificate.expiresAt) : "the stored date"}.`,
      href: "/student/certificates",
    });
  }
}

export async function studentCertificateHome(studentId: string) {
  await expireDueCertificates();
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student?.groupId) {
    return { courses: [], preference: await preferenceOf(studentId), note: "You are not in a learning group, so no course certificate can be matched." };
  }
  const assigned = await prisma.courseAssignment.findMany({
    where: { groupId: student.groupId },
    include: { course: { select: { id: true, title: true, status: true } } },
  });
  const courses = [];
  for (const item of assigned) {
    const evaluation = await evaluateCourse(studentId, item.courseId);
    await persistEvaluation(evaluation);
    if (evaluation.eligible && !evaluation.certificates.some((certificate) => certificate.status === "ISSUED")) {
      await notifyEligible(studentId, evaluation.courseTitle);
    }
    const issued = await maybeAutoIssue(studentId, item.courseId, evaluation);
    courses.push(issued ?? evaluation);
  }
  return {
    courses,
    preference: await preferenceOf(studentId),
    note: "Practice, XP, badges, streaks, and the AI tutor do not count toward a certificate.",
    definitions: STATUS_DEFINITIONS,
  };
}

async function maybeAutoIssue(studentId: string, courseId: string, evaluation: Evaluation): Promise<Evaluation | null> {
  const settings = await loadSettings();
  if (!settings.autoIssue || !evaluation.eligible) return null;
  if (evaluation.certificates.some((item) => item.status === "ISSUED")) return null;
  try {
    await issueCertificate({
      actorId: null,
      studentId,
      courseId,
      reason: "Automatic issuance is turned on.",
      automatic: true,
      origin: configuredAppOrigin(),
    });
    return evaluateCourse(studentId, courseId);
  } catch (err) {
    evaluation.requirements.push({
      key: "issuance",
      requirement: "Automatic certificate",
      status: "MISSING",
      evidence: err instanceof Error ? err.message : "Automatic issuance failed.",
      missingAction: "An administrator needs to fix the certificate template, signatory, or numbering before a certificate can be issued.",
    });
    return evaluation;
  }
}

export async function issueCertificate(input: {
  actorId: string | null;
  studentId: string;
  courseId: string;
  reason: string;
  automatic: boolean;
  origin: string;
  recertifiesId?: string;
}) {
  const evaluation = await evaluateCourse(input.studentId, input.courseId);
  if (!evaluation.eligible) {
    const missing = evaluation.requirements.filter((item) => item.status === "MISSING").map((item) => item.requirement);
    throw new ApiError(409, `This student is not eligible. Still needed: ${missing.join("; ") || "a configured rule"}.`);
  }
  if (!input.recertifiesId) {
    const active = await prisma.certificate.findFirst({ where: { studentId: input.studentId, courseId: input.courseId, status: "ISSUED" } });
    if (active) throw new ApiError(409, "An active certificate already exists. Correct, revoke, or recertify it instead of issuing a duplicate.");
  }
  const assigned = await courseAssigned(input.studentId, input.courseId);
  if (!assigned) throw new ApiError(409, "This course is not assigned to the student's group. Issuance stopped.");
  const settings = await loadSettings();
  assertNumberingPattern(settings.pattern, settings.width);
  const template = await prisma.certificateTemplate.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  if (!template) throw new ApiError(409, "No active certificate template. Issuance stopped.");
  const signatory = await prisma.certificateSignatory.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  if (settings.requireSignature && !signatory) throw new ApiError(409, "No active signatory. Issuance stopped.");
  const rule = await prisma.courseCompletionRule.findUnique({ where: { courseId: input.courseId } });
  if (!rule) throw new ApiError(409, "No completion rule is saved. Issuance stopped.");

  const created = await prisma.$transaction(async (tx) => {
    const year = orgYear();
    const publicId = await allocatePublicId(tx, settings.prefix, year, settings.pattern, settings.width);
    const issuedAt = new Date();
    const expiresAt = expirationDate(rule.rules, issuedAt);
    const snapshot = snapshotFrom(evaluation, {
      publicId,
      origin: input.origin,
      organizationName: template.organizationName || settings.organizationName,
      templateTitle: template.title,
      footer: template.footer,
      signatoryName: signatory?.name ?? null,
      signatoryTitle: signatory?.title ?? null,
      issuedAt,
      expiresAt,
      showScore: template.showScore,
      showLevel: template.showLevel,
      publicScore: template.publicScore,
      preview: false,
    });
    let rendered;
    try {
      rendered = await renderCertificatePdf(snapshot);
    } catch (err) {
      throw new ApiError(409, err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Certificate PDF failed the integrity check. Nothing was issued.");
    }
    if (!rendered.qrEmbedded) throw new ApiError(409, "Certificate QR code failed the integrity check. Nothing was issued.");
    const pdfSha256 = createHash("sha256").update(rendered.bytes).digest("hex");
    const certificate = await tx.certificate.create({
      data: {
        publicId,
        studentId: input.studentId,
        courseId: input.courseId,
        templateId: template.id,
        signatoryId: signatory?.id,
        status: "ISSUED",
        issuedAt,
        expiresAt,
        completionDate: issuedAt,
        downloadToken: randomBytes(32).toString("hex"),
        pdfBytes: Buffer.from(rendered.bytes),
        pdfSha256,
        snapshot: JSON.stringify(snapshot),
        issuedById: input.actorId,
        automatic: input.automatic,
        recertifiesId: input.recertifiesId,
      },
    });
    await tx.certificateVersion.create({
      data: { certificateId: certificate.id, version: 1, snapshot: certificate.snapshot, reason: input.reason, createdById: input.actorId },
    });
    await tx.courseCompletionRecord.upsert({
      where: { studentId_courseId: { studentId: input.studentId, courseId: input.courseId } },
      create: { studentId: input.studentId, courseId: input.courseId, status: "CERTIFICATE_ISSUED", eligible: true, completedAt: issuedAt, completedById: input.actorId, evaluatedAt: issuedAt },
      update: { status: "CERTIFICATE_ISSUED", eligible: true, evaluatedAt: issuedAt },
    });
    return certificate;
  });

  await audit({
    actorId: input.actorId,
    action: input.automatic ? "CERTIFICATE_ISSUED_AUTOMATIC" : "CERTIFICATE_ISSUED",
    entityType: "CERTIFICATE",
    entityId: created.id,
    metadata: { publicId: created.publicId, courseId: input.courseId, studentId: input.studentId, reason: input.reason },
  });
  await notifyCertificate(input.studentId, "issued", {
    type: "CERT_ISSUED",
    title: "Certificate issued",
    body: `${created.publicId} is ready to download.`,
    href: "/student/certificates",
  });
  return { publicId: created.publicId, downloadPath: `/api/certificates/download/${created.downloadToken}`, status: created.status };
}

async function allocatePublicId(tx: Prisma.TransactionClient, prefix: string, year: number, pattern: string, width: number) {
  let row = await tx.certificateSequence.findUnique({ where: { prefix_year: { prefix, year } } });
  if (!row) {
    try {
      row = await tx.certificateSequence.create({ data: { prefix, year, nextNumber: 1 } });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
      row = await tx.certificateSequence.findUniqueOrThrow({ where: { prefix_year: { prefix, year } } });
    }
  }
  const updated = await tx.certificateSequence.update({ where: { id: row.id }, data: { nextNumber: { increment: 1 } } });
  const publicId = formatCertificateId(pattern, year, updated.nextNumber - 1, width, prefix);
  const clash = await tx.certificate.findUnique({ where: { publicId } });
  if (clash) throw new ApiError(409, "That certificate number already exists. Numbering was not reused.");
  return publicId;
}

function expirationDate(rulesJson: string, issuedAt: Date): Date | null {
  try {
    const rules = parseCompletionRules(JSON.parse(rulesJson));
    if (!rules.expirationMonths) return null;
    const expires = new Date(issuedAt);
    expires.setUTCMonth(expires.getUTCMonth() + rules.expirationMonths);
    return expires;
  } catch {
    return null;
  }
}

function snapshotFrom(evaluation: Evaluation, extra: {
  publicId: string | null;
  origin: string;
  organizationName: string;
  templateTitle: string;
  footer: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  showScore: boolean;
  showLevel: boolean;
  publicScore: boolean;
  preview: boolean;
}): CertificateSnapshot {
  return {
    studentName: evaluation.studentName,
    courseTitle: evaluation.courseTitle,
    courseCode: evaluation.courseCode,
    organizationName: extra.organizationName,
    templateTitle: extra.templateTitle,
    footer: extra.footer,
    signatoryName: extra.signatoryName,
    signatoryTitle: extra.signatoryTitle,
    issuedAt: officialDateTime(extra.issuedAt),
    completionDate: officialDateTime(extra.issuedAt),
    expiresAt: extra.expiresAt ? officialDateTime(extra.expiresAt) : null,
    certificateId: extra.publicId,
    verificationUrl: extra.publicId ? `${extra.origin}/verify/certificate/${extra.publicId}` : null,
    plannedHours: evaluation.hours.planned,
    recordedHours: evaluation.hours.recorded,
    hoursNote: evaluation.hours.recordedNote,
    officialScore: extra.showScore ? evaluation.officialScore : null,
    englishLevel: extra.showLevel ? evaluation.englishLevel : null,
    showScore: extra.showScore,
    showLevel: extra.showLevel,
    publicScore: extra.publicScore,
    ruleSummary: evaluation.ruleSummary ?? "No rule",
    preview: extra.preview,
  };
}

export async function previewCertificate(viewer: SessionUser, studentId: string, courseId: string, origin: string) {
  await visibleStudent(viewer, studentId);
  const before = await prisma.certificate.count();
  const evaluation = await evaluateCourse(studentId, courseId);
  const settings = await loadSettings();
  const template = await prisma.certificateTemplate.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  const signatory = await prisma.certificateSignatory.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  const snapshot = snapshotFrom(evaluation, {
    publicId: null,
    origin,
    organizationName: template?.organizationName || settings.organizationName,
    templateTitle: template?.title || "Certificate of Completion",
    footer: template?.footer ?? null,
    signatoryName: signatory?.name ?? null,
    signatoryTitle: signatory?.title ?? null,
    issuedAt: new Date(),
    expiresAt: null,
    showScore: template?.showScore ?? false,
    showLevel: template?.showLevel ?? false,
    publicScore: false,
    preview: true,
  });
  const rendered = await renderCertificatePdf(snapshot);
  const after = await prisma.certificate.count();
  if (after !== before) throw new ApiError(500, "Preview must not create a certificate.");
  return { bytes: rendered.bytes, eligible: evaluation.eligible, certificateId: null as string | null };
}

export async function revokeCertificate(actor: SessionUser, publicId: string, reason: string) {
  const certificate = await prisma.certificate.findUnique({ where: { publicId } });
  if (!certificate || certificate.status === "SUPERSEDED") throw new ApiError(404, "Certificate not found.");
  if (certificate.status === "REVOKED") throw new ApiError(409, "This certificate is already revoked.");
  await prisma.$transaction([
    prisma.certificate.update({ where: { id: certificate.id }, data: { status: "REVOKED" } }),
    prisma.certificateRevocation.create({ data: { certificateId: certificate.id, reason, actorId: actor.id } }),
  ]);
  await audit({
    actorId: actor.id,
    action: "CERTIFICATE_REVOKED",
    entityType: "CERTIFICATE",
    entityId: certificate.id,
    metadata: { publicId, reason, studentId: certificate.studentId },
  });
  await notifyCertificate(certificate.studentId, "revoked", {
    type: "CERT_REVOKED",
    title: "Certificate revoked",
    body: `${publicId} was revoked. The record is kept.`,
    href: "/student/certificates",
  });
  return { publicId, status: "REVOKED" };
}

export async function correctCertificate(actor: SessionUser, publicId: string, reason: string, origin: string) {
  const previous = await prisma.certificate.findUnique({ where: { publicId } });
  if (!previous || previous.status === "SUPERSEDED") throw new ApiError(404, "Certificate not found.");
  const previousSnapshot = JSON.parse(previous.snapshot) as CertificateSnapshot;
  const evaluation = await evaluateCourse(previous.studentId, previous.courseId);
  const settings = await loadSettings();
  const created = await prisma.$transaction(async (tx) => {
    const year = orgYear();
    const nextId = await allocatePublicId(tx, settings.prefix, year, settings.pattern, settings.width);
    const snapshot: CertificateSnapshot = {
      ...previousSnapshot,
      studentName: evaluation.studentName,
      courseTitle: evaluation.courseTitle,
      courseCode: evaluation.courseCode,
      certificateId: nextId,
      verificationUrl: `${origin}/verify/certificate/${nextId}`,
      preview: false,
    };
    let rendered;
    try {
      rendered = await renderCertificatePdf(snapshot);
    } catch (err) {
      throw new ApiError(409, err instanceof Error ? err.message : "Certificate PDF failed the integrity check. The original certificate was not changed.");
    }
    if (!rendered.qrEmbedded) throw new ApiError(409, "Certificate QR code failed the integrity check. The original certificate was not changed.");
    const certificate = await tx.certificate.create({
      data: {
        publicId: nextId,
        studentId: previous.studentId,
        courseId: previous.courseId,
        templateId: previous.templateId,
        signatoryId: previous.signatoryId,
        status: "ISSUED",
        issuedAt: new Date(),
        expiresAt: previous.expiresAt,
        completionDate: previous.completionDate,
        downloadToken: randomBytes(32).toString("hex"),
        pdfBytes: Buffer.from(rendered.bytes),
        pdfSha256: createHash("sha256").update(rendered.bytes).digest("hex"),
        snapshot: JSON.stringify(snapshot),
        issuedById: actor.id,
        automatic: false,
        supersedesId: previous.id,
      },
    });
    await tx.certificate.update({ where: { id: previous.id }, data: { status: "SUPERSEDED", supersededById: certificate.id } });
    await tx.certificateVersion.create({
      data: { certificateId: certificate.id, version: 1, snapshot: certificate.snapshot, reason, createdById: actor.id },
    });
    return certificate;
  });
  const unchanged = await prisma.certificate.findUnique({ where: { id: previous.id } });
  if (unchanged?.snapshot !== previous.snapshot) throw new ApiError(500, "The original certificate snapshot changed. That is not allowed.");
  await audit({
    actorId: actor.id,
    action: "CERTIFICATE_CORRECTED",
    entityType: "CERTIFICATE",
    entityId: created.id,
    metadata: { previousPublicId: publicId, publicId: created.publicId, reason },
  });
  return { publicId: created.publicId, supersedes: publicId, previousSnapshotUnchanged: true };
}

export async function recertifyCertificate(actor: SessionUser, publicId: string, reason: string, origin: string) {
  const previous = await prisma.certificate.findUnique({ where: { publicId } });
  if (!previous) throw new ApiError(404, "Certificate not found.");
  const evaluation = await evaluateCourse(previous.studentId, previous.courseId);
  if (!evaluation.eligible) throw new ApiError(409, "Recertification requires the current official requirements to be met.");
  const issued = await issueCertificate({
    actorId: actor.id,
    studentId: previous.studentId,
    courseId: previous.courseId,
    reason,
    automatic: false,
    origin,
    recertifiesId: previous.id,
  });
  await audit({
    actorId: actor.id,
    action: "CERTIFICATE_RECERTIFIED",
    entityType: "CERTIFICATE",
    entityId: previous.id,
    metadata: { previousPublicId: publicId, publicId: issued.publicId, reason },
  });
  return { ...issued, recertifies: publicId };
}

export async function recordCompletion(actor: SessionUser, studentId: string, courseId: string, reason: string) {
  const evaluation = await evaluateCourse(studentId, courseId);
  if (!evaluation.eligible) throw new ApiError(409, "Completion can be recorded only after every official requirement is met.");
  const now = new Date();
  await prisma.courseCompletionRecord.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: { studentId, courseId, status: "COMPLETED", eligible: true, completedAt: now, completedById: actor.id, evaluatedAt: now },
    update: { completedAt: now, completedById: actor.id, eligible: true, evaluatedAt: now },
  });
  await audit({ actorId: actor.id, action: "COURSE_COMPLETED", entityType: "CERTIFICATE", entityId: courseId, metadata: { studentId, courseId, reason } });
  return { status: "COMPLETED" };
}

export async function archiveCompletion(actor: SessionUser, studentId: string, courseId: string, reason: string) {
  const active = await prisma.certificate.findFirst({ where: { studentId, courseId, status: "ISSUED" } });
  if (active) throw new ApiError(409, "Revoke or leave the active certificate before archiving this completion record.");
  await prisma.courseCompletionRecord.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: { studentId, courseId, status: "ARCHIVED", archivedAt: new Date(), archiveReason: reason },
    update: { status: "ARCHIVED", archivedAt: new Date(), archiveReason: reason },
  });
  await audit({ actorId: actor.id, action: "COMPLETION_ARCHIVED", entityType: "CERTIFICATE", entityId: courseId, metadata: { studentId, courseId, reason } });
  return { status: "ARCHIVED" };
}

export async function saveRule(actor: SessionUser, courseId: string, rules: unknown) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new ApiError(404, "Course not found.");
  let parsed;
  try {
    parsed = parseCompletionRules(rules);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : "The completion rule is not valid.");
  }
  const previous = await prisma.courseCompletionRule.findUnique({ where: { courseId } });
  await prisma.courseCompletionRule.upsert({
    where: { courseId },
    create: { courseId, rules: JSON.stringify(parsed), updatedById: actor.id },
    update: { rules: JSON.stringify(parsed), updatedById: actor.id },
  });
  await audit({
    actorId: actor.id,
    action: "COMPLETION_RULE_SAVED",
    entityType: "CERTIFICATE",
    entityId: courseId,
    metadata: { previous: previous?.rules ?? null, next: ruleSummary(parsed) },
  });
  return { courseId, summary: ruleSummary(parsed) };
}

export async function saveOverride(actor: SessionUser, input: { studentId: string; courseId: string; requirementKey: string; reason: string }) {
  const allowed = ["lessons", "assignments", "exams", "quizzes", "attendance", "speaking", "listening", "teacherApproval", "hours"];
  if (!allowed.includes(input.requirementKey)) throw new ApiError(400, "That requirement cannot be waived.");
  await visibleStudent(actor, input.studentId);
  await prisma.requirementOverride.updateMany({
    where: { studentId: input.studentId, courseId: input.courseId, requirementKey: input.requirementKey, active: true },
    data: { active: false },
  });
  const row = await prisma.requirementOverride.create({
    data: { studentId: input.studentId, courseId: input.courseId, requirementKey: input.requirementKey, reason: input.reason.trim(), actorId: actor.id },
  });
  await audit({
    actorId: actor.id,
    action: "REQUIREMENT_OVERRIDDEN",
    entityType: "CERTIFICATE",
    entityId: row.id,
    metadata: { studentId: input.studentId, courseId: input.courseId, requirementKey: input.requirementKey, reason: input.reason.trim() },
  });
  return { id: row.id, visible: true };
}

export async function saveApproval(actor: SessionUser, input: { studentId: string; courseId: string; kind: string; status: string; note?: string }) {
  if (!["SPEAKING", "WRITING", "PROJECT"].includes(input.kind)) throw new ApiError(400, "Choose speaking, writing, or project.");
  if (!["APPROVED", "NEEDS_REVISION"].includes(input.status)) throw new ApiError(400, "Choose approved or needs revision.");
  await visibleStudent(actor, input.studentId);
  const row = await prisma.teacherApproval.create({
    data: {
      studentId: input.studentId,
      courseId: input.courseId,
      kind: input.kind,
      status: input.status,
      note: input.note?.trim() || null,
      actorId: actor.id,
    },
  });
  await audit({
    actorId: actor.id,
    action: "TEACHER_APPROVAL_RECORDED",
    entityType: "CERTIFICATE",
    entityId: row.id,
    metadata: { studentId: input.studentId, courseId: input.courseId, kind: input.kind, status: input.status },
  });
  return { id: row.id };
}

export async function batchIssue(actor: SessionUser, courseId: string, groupId: string, reason: string, origin: string) {
  await assertGroupAccess(actor, groupId);
  const assigned = await prisma.courseAssignment.findFirst({ where: { courseId, groupId } });
  if (!assigned) throw new ApiError(404, "That course is not assigned to this group.");
  const template = await prisma.certificateTemplate.findFirst({ where: { active: true } });
  const settings = await loadSettings();
  if (!template) throw new ApiError(409, "No active certificate template. No certificates were issued.");
  if (settings.requireSignature) {
    const signatory = await prisma.certificateSignatory.findFirst({ where: { active: true } });
    if (!signatory) throw new ApiError(409, "No active signatory. No certificates were issued.");
  }
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", groupId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const issued: { studentName: string; publicId: string }[] = [];
  const skipped: { studentName: string; reasons: string[] }[] = [];
  for (const student of students) {
    const name = fullName(student);
    if (student.status !== "ACTIVE") {
      skipped.push({ studentName: name, reasons: ["Account is deactivated."] });
      continue;
    }
    try {
      const result = await issueCertificate({ actorId: actor.id, studentId: student.id, courseId, reason, automatic: false, origin });
      issued.push({ studentName: name, publicId: result.publicId });
    } catch (err) {
      skipped.push({ studentName: name, reasons: [err instanceof Error ? err.message : "Issuance failed."] });
    }
  }
  await audit({
    actorId: actor.id,
    action: "CERTIFICATE_BATCH",
    entityType: "CERTIFICATE",
    entityId: courseId,
    metadata: { groupId, issued: issued.length, skipped: skipped.length, reason },
  });
  return { issued, skipped };
}

export async function saveSetting(actor: SessionUser, key: string, value: string) {
  if (!Object.prototype.hasOwnProperty.call(SETTING_DEFAULTS, key)) throw new ApiError(400, "That setting is not recognized.");
  if (key === "numberingPattern" || key === "sequenceWidth" || key === "numberingPrefix") {
    const current = await loadSettings();
    const pattern = key === "numberingPattern" ? value : current.pattern;
    const width = key === "sequenceWidth" ? Number(value) : current.width;
    const prefix = key === "numberingPrefix" ? value : current.prefix;
    if (!/^[A-Z0-9]{2,12}$/.test(prefix)) throw new ApiError(400, "Prefix must be 2 to 12 capital letters or numbers.");
    try {
      assertNumberingPattern(pattern, width);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : "The numbering pattern is not valid.");
    }
  }
  if (key === "autoIssue" && !["true", "false"].includes(value)) throw new ApiError(400, "Automatic issuance must be true or false.");
  const previous = await prisma.certificationSetting.findUnique({ where: { scopeKey_key: { scopeKey: "GLOBAL", key } } });
  await prisma.certificationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key } },
    create: { scopeKey: "GLOBAL", key, value, updatedById: actor.id },
    update: { value, updatedById: actor.id },
  });
  await audit({
    actorId: actor.id,
    action: "CERTIFICATION_SETTING_SAVED",
    entityType: "CERTIFICATE",
    entityId: key,
    metadata: { key, previous: previous?.value ?? SETTING_DEFAULTS[key], next: value },
  });
  return { key, value };
}

export async function saveTemplate(actor: SessionUser, input: {
  name: string;
  organizationName: string;
  title: string;
  footer?: string;
  showScore: boolean;
  showLevel: boolean;
  publicScore: boolean;
}) {
  if (input.publicScore && !input.showScore) throw new ApiError(400, "A public score also has to be shown on the certificate.");
  await prisma.certificateTemplate.updateMany({ where: { active: true }, data: { active: false } });
  const template = await prisma.certificateTemplate.create({
    data: {
      name: input.name.trim(),
      organizationName: input.organizationName.trim(),
      title: input.title.trim(),
      footer: input.footer?.trim() || null,
      showScore: input.showScore,
      showLevel: input.showLevel,
      publicScore: input.publicScore,
      active: true,
    },
  });
  await audit({ actorId: actor.id, action: "CERTIFICATE_TEMPLATE_SAVED", entityType: "CERTIFICATE", entityId: template.id, metadata: { name: template.name, publicScore: template.publicScore } });
  return { id: template.id };
}

export async function saveSignatory(actor: SessionUser, name: string, title: string) {
  await prisma.certificateSignatory.updateMany({ where: { active: true }, data: { active: false } });
  const signatory = await prisma.certificateSignatory.create({ data: { name: name.trim(), title: title.trim(), active: true } });
  await audit({ actorId: actor.id, action: "CERTIFICATE_SIGNATORY_SAVED", entityType: "CERTIFICATE", entityId: signatory.id, metadata: { name: signatory.name, title: signatory.title } });
  return { id: signatory.id };
}

export async function savePreference(userId: string, input: { notifyEligible: boolean; notifyIssued: boolean; notifyRevoked: boolean; notifyExpiring: boolean }) {
  await prisma.certificatePreference.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
  return input;
}

export async function downloadCertificate(viewer: SessionUser, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(404, "Certificate file not found.");
  const certificate = await prisma.certificate.findUnique({ where: { downloadToken: token } });
  if (!certificate) throw new ApiError(404, "Certificate file not found.");
  await visibleStudent(viewer, certificate.studentId);
  const bytes = Buffer.from(certificate.pdfBytes);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== certificate.pdfSha256 || bytes.subarray(0, 5).toString() !== "%PDF-") {
    await audit({ actorId: viewer.id, action: "CERTIFICATE_DOWNLOAD_BLOCKED", entityType: "CERTIFICATE", entityId: certificate.id, metadata: { publicId: certificate.publicId } });
    throw new ApiError(409, "The stored certificate file failed the integrity check. Download stopped.");
  }
  await audit({ actorId: viewer.id, action: "CERTIFICATE_DOWNLOADED", entityType: "CERTIFICATE", entityId: certificate.id, metadata: { publicId: certificate.publicId } });
  return { bytes, publicId: certificate.publicId };
}

export async function publicVerification(code: string) {
  await expireDueCertificates();
  if (!/^[A-Z0-9-]{8,40}$/.test(code)) return { status: "NOT_FOUND" as const };
  const certificate = await prisma.certificate.findUnique({ where: { publicId: code } });
  if (!certificate) {
    await prisma.certificateVerification.create({ data: { publicId: code, result: "NOT_FOUND" } });
    return { status: "NOT_FOUND" as const };
  }
  let status = certificate.status;
  if (status === "ISSUED" && certificate.expiresAt && certificate.expiresAt < new Date()) status = "EXPIRED";
  const snapshot = safeSnapshot(certificate.snapshot);
  const result = status === "ISSUED" ? "VALID" : status === "REVOKED" ? "REVOKED" : status === "EXPIRED" ? "EXPIRED" : status === "SUPERSEDED" ? "SUPERSEDED" : "NOT_VALID";
  await prisma.certificateVerification.create({ data: { certificateId: certificate.id, publicId: code, result } });
  if (!snapshot) return { status: "NOT_VALID" as const, certificateId: certificate.publicId };
  const body: {
    status: string;
    certificateId: string;
    studentName: string;
    courseTitle: string;
    issuedAt: string;
    expiresAt: string | null;
    officialScore?: string;
    replacementNote?: string;
  } = {
    status: result,
    certificateId: certificate.publicId,
    studentName: snapshot.studentName,
    courseTitle: snapshot.courseTitle,
    issuedAt: snapshot.issuedAt,
    expiresAt: snapshot.expiresAt,
  };
  if (snapshot.publicScore && snapshot.officialScore) body.officialScore = snapshot.officialScore;
  if (status === "SUPERSEDED") body.replacementNote = "This certificate was replaced. It is not valid.";
  return body;
}

function safeSnapshot(raw: string): CertificateSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as CertificateSnapshot;
    if (!parsed.studentName || !parsed.courseTitle) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function trainingRecord(viewer: SessionUser, studentId: string) {
  const student = await visibleStudent(viewer, studentId);
  if (!student.groupId) return { studentName: fullName(student), entries: [], note: "No learning group is assigned." };
  const assigned = await prisma.courseAssignment.findMany({ where: { groupId: student.groupId }, include: { course: true } });
  const entries = [];
  for (const item of assigned) {
    const evaluation = await evaluateCourse(student.id, item.courseId);
    const first = await firstOfficialDate(student.id, item.courseId);
    entries.push({
      courseTitle: evaluation.courseTitle,
      courseCode: evaluation.courseCode,
      status: evaluation.status,
      statusDefinition: evaluation.statusDefinition,
      startedAt: first,
      completionRecordedAt: evaluation.completionRecordedAt,
      attendance: evaluation.attendance,
      hours: evaluation.hours,
      certificateIds: evaluation.certificates.map((certificate) => ({ id: certificate.publicId, status: certificate.status })),
      officialScore: evaluation.officialScore,
    });
  }
  return {
    studentName: fullName(student),
    entries,
    note: "This is an official training record. Practice, XP, badges, streaks, and AI tutor activity are not included. Attendance hours are shown only when attendance records exist.",
  };
}

async function firstOfficialDate(studentId: string, courseId: string): Promise<string | null> {
  const [progress, submission, attempt, attendance] = await Promise.all([
    prisma.lessonProgress.findFirst({ where: { studentId, lesson: { module: { courseId } } }, orderBy: { createdAt: "asc" } }),
    prisma.assignmentSubmission.findFirst({ where: { studentId, assignment: { courseId } }, orderBy: { createdAt: "asc" } }),
    prisma.assessmentAttempt.findFirst({ where: { studentId, assessment: { courseId, type: "EXAM" } }, orderBy: { startedAt: "asc" } }),
    prisma.attendanceRecord.findFirst({ where: { studentId, session: { courseId } }, orderBy: { createdAt: "asc" } }),
  ]);
  const dates = [progress?.createdAt, submission?.createdAt, attempt?.startedAt, attendance?.createdAt].filter((date): date is Date => Boolean(date));
  if (dates.length === 0) return null;
  return officialDateTime(new Date(Math.min(...dates.map((date) => date.getTime()))));
}

export async function teacherDesk(viewer: SessionUser, groupId?: string) {
  const ids = await assignedGroupIds(viewer);
  const groups = await prisma.learningGroup.findMany({
    where: ids === null ? { status: "ACTIVE" } : { id: { in: ids }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selected = groupId ?? groups[0]?.id ?? null;
  if (!selected) return { groups, selected: null, rows: [], courses: [], students: [], definitions: STATUS_DEFINITIONS };
  await assertGroupAccess(viewer, selected);
  const [students, courses] = await Promise.all([
    prisma.user.findMany({ where: { role: "STUDENT", groupId: selected }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.courseAssignment.findMany({ where: { groupId: selected }, include: { course: { select: { id: true, title: true } } } }),
  ]);
  const rows = [];
  for (const student of students) {
    for (const course of courses) {
      rows.push(await evaluateCourse(student.id, course.courseId));
    }
  }
  return { groups, selected, courses: courses.map((item) => item.course), students: students.map((student) => ({ id: student.id, name: fullName(student) })), rows, definitions: STATUS_DEFINITIONS };
}

export async function adminDesk() {
  await expireDueCertificates();
  const [courses, templates, signatories, settings, certificates, groups, students] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, include: { completionRuleConfig: true, assignments: { select: { groupId: true } } } }),
    prisma.certificateTemplate.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.certificateSignatory.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    loadSettings(),
    prisma.certificate.findMany({ orderBy: { issuedAt: "desc" }, take: 20, include: { student: true, course: true } }),
    prisma.learningGroup.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, groupId: true, status: true } }),
  ]);
  return {
    definitions: STATUS_DEFINITIONS,
    settings,
    groups,
    templates,
    signatories,
    students: students.map((student) => ({ id: student.id, name: fullName(student), groupId: student.groupId, status: student.status })),
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      groupIds: course.assignments.map((item) => item.groupId),
      rules: course.completionRuleConfig ? safeParse(course.completionRuleConfig.rules) : null,
    })),
    certificates: certificates.map((certificate) => ({
      publicId: certificate.publicId,
      status: certificate.status,
      studentName: fullName(certificate.student),
      courseTitle: certificate.course.title,
      issuedAt: officialDateTime(certificate.issuedAt),
      automatic: certificate.automatic,
    })),
    emptyRules: EMPTY_RULES,
  };
}

function safeParse(raw: string): CompletionRules | null {
  try {
    return parseCompletionRules(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function courseAssigned(studentId: string, courseId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!student?.groupId) return false;
  const row = await prisma.courseAssignment.findUnique({ where: { courseId_groupId: { courseId, groupId: student.groupId } } });
  return Boolean(row);
}

async function preferenceOf(userId: string) {
  const row = await prisma.certificatePreference.findUnique({ where: { userId } });
  return {
    notifyEligible: row?.notifyEligible ?? true,
    notifyIssued: row?.notifyIssued ?? true,
    notifyRevoked: row?.notifyRevoked ?? true,
    notifyExpiring: row?.notifyExpiring ?? true,
  };
}

async function notifyCertificate(userId: string, kind: "eligible" | "issued" | "revoked" | "expiring", input: { type: string; title: string; body: string; href: string }) {
  const pref = await preferenceOf(userId);
  const allowed = kind === "eligible" ? pref.notifyEligible : kind === "issued" ? pref.notifyIssued : kind === "revoked" ? pref.notifyRevoked : pref.notifyExpiring;
  if (!allowed) return;
  const existing = await prisma.notification.findFirst({ where: { userId, type: input.type, href: input.href, body: input.body } });
  if (existing) return;
  await notifyUsers([userId], input);
}

export async function notifyEligible(studentId: string, courseTitle: string) {
  await notifyCertificate(studentId, "eligible", {
    type: "CERT_ELIGIBLE",
    title: "Certificate requirements are complete",
    body: `${courseTitle} meets the saved official requirements. A certificate is not issued until an administrator issues it, unless automatic issuance is on.`,
    href: "/student/certificates",
  });
}

export { EMPTY_RULES };
