/**
 * Safe, write-free preview layer for future book imports.
 *
 * This module deliberately does not touch Prisma, create BookContentNode rows,
 * or publish anything. A caller must supply a decoder for XLSX files; the app
 * currently has no XLSX parser dependency. Rights evidence is captured as a
 * user assertion and still requires human review before any content is used.
 */
import { z } from "zod";

export const BOOK_IMPORT_NODE_TYPES = ["CHAPTER", "UNIT", "LESSON", "SECTION", "EXERCISE", "QUIZ"] as const;
const nodeTypeSchema = z.enum(BOOK_IMPORT_NODE_TYPES);

export const bookImportRowSchema = z.object({
  key: z.string().trim().min(1).max(120),
  parentKey: z.string().trim().max(120).optional().default(""),
  nodeType: nodeTypeSchema,
  title: z.string().trim().min(1).max(300),
  content: z.string().max(100_000).optional().default(""),
  source: z.string().trim().max(500).optional().default(""),
  rightsNote: z.string().trim().max(1000).optional().default(""),
  rightsConfirmed: z.preprocess((value) => value === true || value === "true" || value === "1", z.boolean()).optional().default(false),
  mappedCourseCode: z.string().trim().max(120).optional().default(""),
  mappedLessonTitle: z.string().trim().max(300).optional().default(""),
}).strict();

export type BookImportRow = z.infer<typeof bookImportRowSchema>;
export type ImportIssue = { row: number; code: string; message: string; severity: "ERROR" | "WARNING" };
export type BookImportPreview = {
  accepted: boolean;
  writesPerformed: false;
  rows: Array<BookImportRow & { proposedStatus: "DRAFT"; parentRow: number | null }>;
  issues: ImportIssue[];
};

/** RFC 4180-style CSV parsing with quoted commas, escaped quotes and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

export function parseCsvObjects(text: string): Record<string, string>[] {
  const [headerRow, ...dataRows] = parseCsv(text);
  if (!headerRow?.length) throw new Error("CSV must include a header row.");
  const headers = headerRow.map((h) => h.trim());
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length) {
    throw new Error("CSV headers must be non-empty and unique.");
  }
  return dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

/**
 * Validate structured rows and report a non-persisting draft preview.
 * The importer never assumes the submitter owns the text: content-bearing rows
 * require a source, a rights note and an explicit rights-confirmation checkbox.
 */
export function previewBookImport(input: unknown[]): BookImportPreview {
  const issues: ImportIssue[] = [];
  const valid: Array<{ row: BookImportRow; originalIndex: number }> = [];
  input.forEach((candidate, index) => {
    const result = bookImportRowSchema.safeParse(candidate);
    if (!result.success) {
      issues.push({ row: index + 2, code: "INVALID_ROW", message: result.error.issues.map((e) => e.message).join("; "), severity: "ERROR" });
      return;
    }
    valid.push({ row: result.data, originalIndex: index });
  });

  const firstByKey = new Map<string, number>();
  valid.forEach(({ row, originalIndex }) => {
    const rowNumber = originalIndex + 2;
    if (firstByKey.has(row.key)) issues.push({ row: rowNumber, code: "DUPLICATE_KEY", message: `Key “${row.key}” is repeated.`, severity: "ERROR" });
    else firstByKey.set(row.key, originalIndex);
    if (row.content.trim() && (!row.source || !row.rightsNote || !row.rightsConfirmed)) {
      issues.push({ row: rowNumber, code: "RIGHTS_REVIEW_REQUIRED", message: "Content is not eligible for draft import until the submitter provides its source, rights note and explicit rights confirmation. Metadata-only import remains possible.", severity: "ERROR" });
    }
    if (!row.content.trim()) issues.push({ row: rowNumber, code: "METADATA_ONLY", message: "No text content supplied; this row proposes structure/metadata only.", severity: "WARNING" });
  });

  valid.forEach(({ row, originalIndex }) => {
    if (!row.parentKey) return;
    const parentIndex = firstByKey.get(row.parentKey);
    if (parentIndex === undefined) issues.push({ row: originalIndex + 2, code: "MISSING_PARENT", message: `Parent key “${row.parentKey}” does not exist in this import.`, severity: "ERROR" });
    else if (parentIndex === originalIndex) issues.push({ row: originalIndex + 2, code: "SELF_PARENT", message: "A row cannot be its own parent.", severity: "ERROR" });
  });
  valid.forEach(({ row, originalIndex }) => {
    const seen = new Set<string>([row.key]);
    let parentKey = row.parentKey;
    while (parentKey && firstByKey.has(parentKey)) {
      if (seen.has(parentKey)) {
        issues.push({ row: originalIndex + 2, code: "PARENT_CYCLE", message: "Parent links contain a cycle and cannot be imported.", severity: "ERROR" });
        break;
      }
      seen.add(parentKey);
      parentKey = valid[firstByKey.get(parentKey) as number]?.row.parentKey ?? "";
    }
  });

  const errors = issues.some((issue) => issue.severity === "ERROR");
  return {
    accepted: !errors && valid.length > 0,
    writesPerformed: false,
    rows: valid.map(({ row, originalIndex }) => ({ ...row, proposedStatus: "DRAFT", parentRow: row.parentKey && firstByKey.has(row.parentKey) ? (firstByKey.get(row.parentKey) as number) + 2 : null })),
    issues,
  };
}

/**
 * Parser dispatcher intended for an upload route. XLSX requires an injected,
 * reviewed decoder; no package or workbook execution is assumed here.
 */
export async function decodeBookImport(
  format: "json" | "csv" | "xlsx",
  payload: string | Uint8Array,
  decodeXlsx?: (bytes: Uint8Array) => Promise<unknown[]>,
): Promise<unknown[]> {
  if (format === "json") {
    const parsed = JSON.parse(typeof payload === "string" ? payload : new TextDecoder().decode(payload)) as unknown;
    if (!Array.isArray(parsed)) throw new Error("JSON import must be an array of structured rows.");
    return parsed;
  }
  if (format === "csv") {
    return parseCsvObjects(typeof payload === "string" ? payload : new TextDecoder().decode(payload));
  }
  if (!decodeXlsx) throw new Error("XLSX preview requires a server-side workbook decoder; no file has been imported.");
  return decodeXlsx(typeof payload === "string" ? new TextEncoder().encode(payload) : payload);
}
