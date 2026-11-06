/**
 * Official certificate reports. Same authorization as the screens.
 * Alphabetical order is not a ranking.
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { fullName } from "@/lib/utils";
import { assertGroupAccess, assignedGroupIds } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";
import { evaluateCourse } from "@/lib/certificates/engine";
import { officialDateTime } from "@/lib/certificates/rules";
import { renderTablePdf } from "@/lib/certificates/pdf";
import { csv, workbook } from "@/lib/certificates/xlsx";

export const REPORT_KINDS = ["certificates", "completion", "hours", "attendance", "eligibility", "expired", "revoked"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export async function buildReport(viewer: SessionUser, kind: ReportKind, format: "csv" | "xlsx" | "pdf", groupId?: string, courseId?: string) {
  if (viewer.role === "STUDENT") throw new ApiError(403, "You do not have permission to export this report.");
  if (groupId) await assertGroupAccess(viewer, groupId);
  const ids = await assignedGroupIds(viewer);
  const groups = groupId ? [groupId] : ids;
  const rows = await rowsFor(kind, groups, courseId);
  const header = ["Alphabetical order. This is not a ranking.", "Practice, XP, badges, and AI tutor activity are not included.", "Login time is not used as attendance."];
  const table = [headerNote(kind), ...rows];
  if (format === "csv") return { body: Buffer.from(`${header.join(" ")}\n${csv(table)}`), contentType: "text/csv; charset=utf-8", filename: `${kind}.csv` };
  if (format === "xlsx") return { body: workbook(table), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: `${kind}.xlsx` };
  const lines = table.map((row) => row.join(" | "));
  const pdf = await renderTablePdf(`${kind} report`, [...header, ...lines]);
  return { body: Buffer.from(pdf), contentType: "application/pdf", filename: `${kind}.pdf` };
}

function headerNote(kind: ReportKind): string[] {
  if (kind === "hours") return ["Student", "Course", "Planned hours", "Attendance hours", "Note"];
  if (kind === "attendance") return ["Student", "Course", "Present", "Late", "Absent", "Excused", "Completed classes", "Note"];
  if (kind === "eligibility") return ["Student", "Course", "Status", "Eligible", "Still needed"];
  if (kind === "expired" || kind === "revoked") return ["Certificate ID", "Student", "Course", "Status", "Issued", "Reason"];
  if (kind === "certificates") return ["Certificate ID", "Student", "Course", "Status", "Issued", "Automatic"];
  return ["Student", "Course", "Status", "Certificate IDs"];
}

async function rowsFor(kind: ReportKind, groupIds: string[] | null, courseId?: string): Promise<string[][]> {
  if (kind === "certificates" || kind === "expired" || kind === "revoked") return certificateRows(kind, groupIds, courseId);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", ...(groupIds ? { groupId: { in: groupIds } } : {}) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const rows: string[][] = [];
  for (const student of students) {
    if (!student.groupId) continue;
    const assigned = await prisma.courseAssignment.findMany({
      where: { groupId: student.groupId, ...(courseId ? { courseId } : {}) },
      include: { course: true },
    });
    for (const item of assigned) {
      const evaluation = await evaluateCourse(student.id, item.courseId);
      if (kind === "hours") {
        rows.push([
          evaluation.studentName,
          evaluation.courseTitle,
          evaluation.hours.planned === null ? "Not configured" : String(evaluation.hours.planned),
          evaluation.hours.recorded === null ? "No official attendance recorded" : String(evaluation.hours.recorded),
          evaluation.hours.recordedNote,
        ]);
      } else if (kind === "attendance") {
        rows.push([
          evaluation.studentName,
          evaluation.courseTitle,
          String(evaluation.attendance.present),
          String(evaluation.attendance.late),
          String(evaluation.attendance.absent),
          String(evaluation.attendance.excused),
          String(evaluation.attendance.completedSessions),
          evaluation.attendance.note,
        ]);
      } else if (kind === "eligibility") {
        const missing = evaluation.requirements.filter((requirement) => requirement.status === "MISSING").map((requirement) => requirement.requirement);
        rows.push([evaluation.studentName, evaluation.courseTitle, evaluation.status, evaluation.eligible ? "Yes" : "No", missing.join("; ") || "None"]);
      } else {
        rows.push([
          evaluation.studentName,
          evaluation.courseTitle,
          evaluation.status,
          evaluation.certificates.map((certificate) => `${certificate.publicId} ${certificate.status}`).join("; ") || "None",
        ]);
      }
    }
  }
  return rows;
}

async function certificateRows(kind: ReportKind, groupIds: string[] | null, courseId?: string): Promise<string[][]> {
  const status = kind === "expired" ? "EXPIRED" : kind === "revoked" ? "REVOKED" : undefined;
  const certificates = await prisma.certificate.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(courseId ? { courseId } : {}),
      ...(groupIds ? { student: { groupId: { in: groupIds } } } : {}),
    },
    include: { student: true, course: true, revocations: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: [{ student: { lastName: "asc" } }, { issuedAt: "asc" }],
  });
  return certificates.map((certificate) => [
    certificate.publicId,
    fullName(certificate.student),
    certificate.course.title,
    certificate.status,
    officialDateTime(certificate.issuedAt),
    kind === "certificates" ? (certificate.automatic ? "Automatic" : "Manual") : (certificate.revocations[0]?.reason ?? ""),
  ]);
}

export async function transcriptPdf(viewer: SessionUser, studentId: string) {
  if (viewer.role === "STUDENT" && viewer.id !== studentId) throw new ApiError(404, "Student not found.");
  if (viewer.role === "TEACHER") {
    const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" } });
    if (!student?.groupId) throw new ApiError(404, "Student not found.");
    await assertGroupAccess(viewer, student.groupId);
  }
  if (viewer.role !== "ADMIN" && viewer.role !== "TEACHER" && viewer.role !== "STUDENT") throw new ApiError(403, "You do not have permission to perform this action.");
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) throw new ApiError(404, "Student not found.");
  const record = await import("@/lib/certificates/service").then((mod) => mod.trainingRecord(viewer, studentId));
  const lines = [
    record.studentName,
    record.note,
    ...record.entries.flatMap((entry) => [
      `${entry.courseTitle} (${entry.courseCode})`,
      `Status: ${entry.status}. ${entry.statusDefinition}`,
      `Started: ${entry.startedAt ?? "No official start is recorded"}`,
      `Attendance: ${entry.attendance.note}`,
      `Hours: ${entry.hours.recordedNote}`,
      `Certificates: ${entry.certificateIds.map((item) => `${item.id} ${item.status}`).join(", ") || "None"}`,
      entry.officialScore ? `Official exam result: ${entry.officialScore}` : "Official exam result: not included",
    ]),
  ];
  const pdf = await renderTablePdf("Official training record", lines);
  const snapshot = JSON.stringify({ studentName: record.studentName, entries: record.entries, generatedAt: officialDateTime(new Date()) });
  await prisma.transcript.create({
    data: { studentId, generatedById: viewer.id, snapshot, pdfBytes: Buffer.from(pdf) },
  });
  return Buffer.from(pdf);
}
