import { prisma } from "../prisma";
import crypto from "crypto";

export interface ImportRowUser {
  email: string;
  name: string;
  role?: string;
  department?: string;
}

export interface ImportValidationResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: Array<Record<string, any>>;
  errors: Array<{ row: number; error: string }>;
}

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (["=", "+", "-", "@", "\t", "\r"].includes(text[0])) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

export class DataExchangeEngine {
  /**
   * Parses CSV or JSON text and validates rows against enterprise constraints (Dry Run).
   */
  public static async validateImport(
    filename: string,
    content: string,
    entityType: "USERS" | "ENROLLMENTS" | "GROUPS",
    format: "CSV" | "JSON",
    executedById: string,
    conflictStrategy: "EXTERNAL_WINS" | "LMS_WINS" | "MANUAL_REVIEW" = "LMS_WINS"
  ): Promise<ImportValidationResult> {
    if (entityType !== "USERS") throw new Error("Only user CSV/JSON imports are implemented; other entity types are rejected rather than reported as successful.");
    if (format !== "CSV" && format !== "JSON") throw new Error("Only CSV and JSON formats are implemented.");
    if (content.length > 5_000_000) throw new Error("Import payload exceeds the 5 MB limit.");
    const rows: Array<Record<string, any>> = [];
    const errors: Array<{ row: number; error: string }> = [];
    const actor = await prisma.user.findUnique({ where: { id: executedById }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
    const organizationId = actor?.organizationId || actor?.organizationLinks[0]?.organizationId;
    if (!organizationId) throw new Error("Imports require an organization-scoped administrator.");

    if (format === "JSON") {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          rows.push(...parsed);
        } else {
          throw new Error("JSON payload must be an array of objects");
        }
      } catch (err: any) {
        errors.push({ row: 0, error: `Invalid JSON syntax: ${err.message}` });
      }
    } else {
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^['"]|['"]$/g, ""));
        for (let i = 1; i < lines.length; i++) {
          const parts = parseCsvLine(lines[i]);
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => { rowObj[h] = parts[idx] ?? ""; });
          rows.push(rowObj);
        }
      }
    }
    if (rows.length > 5000) throw new Error("Import exceeds the 5,000-row safety limit.");

    // Row-level validation; duplicate rows and pre-existing accounts are never silently skipped.
    let validCount = 0;
    const seenEmails = new Set<string>();
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;
      let valid = true;
      if (entityType === "USERS") {
        const email = String(row.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: rowNum, error: "Missing or invalid email address" }); valid = false;
        } else if (seenEmails.has(email)) {
          errors.push({ row: rowNum, error: "Duplicate email within this import" }); valid = false;
        } else {
          seenEmails.add(email);
          const existing = await prisma.user.findFirst({ where: { email, organizationId }, select: { id: true } });
          if (existing) { errors.push({ row: rowNum, error: "An LMS account already uses this email; verified linking or manual review is required." }); valid = false; }
        }
        if (!String(row.name || "").trim()) {
          errors.push({ row: rowNum, error: "Name is required" }); valid = false;
        }
        const role = String(row.role || "STUDENT").toUpperCase();
        if (!(["STUDENT", "TEACHER"].includes(role))) {
          errors.push({ row: rowNum, error: "Role must be STUDENT or TEACHER; elevated roles cannot be imported." }); valid = false;
        }
      }
      if (valid) validCount++;
    }

    const errorRowCount = new Set(errors.map((entry) => entry.row)).size;
    const batch = await prisma.externalDataImportBatch.create({
      data: {
        organizationId,
        filename,
        entityType,
        format,
        totalRows: rows.length,
        validRows: validCount,
        errorRows: errorRowCount,
        conflictStrategy,
        isDryRun: true,
        status: errors.length === 0 ? "VALIDATED" : "PENDING",
        previewJson: JSON.stringify(rows.slice(0, 10)),
        sourceDataJson: JSON.stringify(rows),
        errorsJson: JSON.stringify(errors.slice(0, 50)), 
        executedById,
      },
    });

    return {
      batchId: batch.id,
      totalRows: rows.length,
      validRows: validCount,
      errorRows: errorRowCount,
      preview: rows.slice(0, 5),
      errors,
    };
  }

  /**
   * Commits an imported batch into database.
   */
  public static async commitImport(batchId: string, executedById: string) {
    const batch = await prisma.externalDataImportBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error(`Import batch ${batchId} not found`);
    }

    if (batch.executedById !== executedById) throw new Error("Only the user who created this import batch may commit it.");
    const actor = await prisma.user.findUnique({ where: { id: executedById }, select: { organizationId: true, organizationLinks: { select: { organizationId: true }, take: 1 } } });
    const actorOrganizationId = actor?.organizationId || actor?.organizationLinks[0]?.organizationId;
    if (!actorOrganizationId || actorOrganizationId !== batch.organizationId) throw new Error("Import batch organization does not match the current administrator.");
    if (batch.status === "COMMITTED") throw new Error(`Batch ${batchId} has already been committed`);
    if (batch.status !== "VALIDATED" || batch.errorRows !== 0) {
      throw new Error("Import cannot be committed until every row passes validation; no partial import is performed.");
    }

    const rows: Array<Record<string, any>> = JSON.parse(batch.sourceDataJson || "[]");
    if (rows.length !== batch.totalRows || rows.length !== batch.validRows) {
      throw new Error("Import batch data integrity check failed; no rows were imported.");
    }

    return await prisma.$transaction(async (tx) => {
      if (batch.entityType === "USERS") {
        for (const row of rows) {
          const email = String(row.email).trim().toLowerCase();
          const nameParts = String(row.name).trim().split(/\s+/);
          const employeeCode = `IMP-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
          const username = `${email.split("@")[0]}_${crypto.randomBytes(4).toString("hex")}`;
          await tx.user.create({
            data: {
              organizationId: batch.organizationId!,
              employeeCode,
              firstName: nameParts[0] || "User",
              lastName: nameParts.slice(1).join(" ") || "External",
              username,
              email,
              role: String(row.role || "STUDENT").toUpperCase() === "TEACHER" ? "TEACHER" : "STUDENT",
              status: "ACTIVE",
              passwordHash: "SSO_MANAGED_EXTERNAL_IDENTITY",
            },
          });
        }
      }
      return tx.externalDataImportBatch.update({
        where: { id: batchId },
        data: { status: "COMMITTED", isDryRun: false, committedAt: new Date() },
      });
    });
  }

  /**
   * Generates CSV export for compliance learning records.
   */
  public static async exportTrainingRecordsCsv(organizationId: string): Promise<string> {
    if (!organizationId) throw new Error("Export requires organization scope.");
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { submittedAt: { not: null }, student: { organizationId } },
      include: {
        student: true,
        assessment: true,
      },
      take: 100,
      orderBy: { submittedAt: "desc" },
    });

    const headers = ["AttemptId", "UserEmail", "UserName", "AssessmentTitle", "Score", "Percentage", "Passed", "CompletedAt"];
    const rows = attempts.map((att) => [
      att.id,
      att.student?.email || "n/a",
      `${att.student?.firstName || "Student"} ${att.student?.lastName || ""}`.trim(),
      att.assessment.title,
      att.score ?? 0,
      att.percentage ?? 0,
      att.passed ? "PASS" : "FAIL",
      att.submittedAt?.toISOString() ?? "",
    ].map(csvCell));

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}
