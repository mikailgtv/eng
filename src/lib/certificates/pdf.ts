/**
 * Server-side certificate and transcript PDFs.
 * A preview is watermarked and is not an issued certificate.
 */
import { inflateSync } from "zlib";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

export type CertificateSnapshot = {
  studentName: string;
  courseTitle: string;
  courseCode: string;
  organizationName: string;
  templateTitle: string;
  footer: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  issuedAt: string;
  completionDate: string;
  expiresAt: string | null;
  certificateId: string | null;
  verificationUrl: string | null;
  plannedHours: number | null;
  recordedHours: number | null;
  hoursNote: string;
  officialScore: string | null;
  englishLevel: string | null;
  showScore: boolean;
  showLevel: boolean;
  publicScore: boolean;
  ruleSummary: string;
  preview: boolean;
};

export type RenderedPdf = { bytes: Uint8Array; qrEmbedded: boolean };

function printable(value: string, label?: string): string {
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (label && (code < 32 || code > 126)) {
      throw new Error(`${label} cannot be printed with the certificate font. Issuance stopped.`);
    }
  }
  return value;
}

function drawCentered(page: PDFPage, font: PDFFont, text: string, y: number, size: number, color = rgb(0.12, 0.16, 0.2)) {
  const safe = printable(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

export async function renderCertificatePdf(snapshot: CertificateSnapshot): Promise<RenderedPdf> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: rgb(0.1, 0.32, 0.3), borderWidth: 2 });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: rgb(0.75, 0.8, 0.78), borderWidth: 1 });

  drawCentered(page, bold, snapshot.organizationName || "EnglishBridge", 520, 12, rgb(0.1, 0.32, 0.3));
  drawCentered(page, bold, snapshot.templateTitle || "Certificate of Completion", 470, 26);
  drawCentered(page, font, "This records official course completion.", 438, 12, rgb(0.28, 0.32, 0.36));
  drawCentered(page, font, printable(snapshot.studentName || "Student", "Student name"), 390, 22);
  drawCentered(page, font, printable(snapshot.courseTitle || "Course", "Course title"), 356, 16);
  drawCentered(page, font, `Course code ${snapshot.courseCode}`, 334, 10, rgb(0.28, 0.32, 0.36));
  drawCentered(page, font, `Completion date: ${snapshot.completionDate}`, 306, 11);
  drawCentered(page, font, snapshot.certificateId ? `Certificate ID: ${snapshot.certificateId}` : "Certificate ID: assigned only when issued", 286, 11);

  const hourLines = [
    snapshot.plannedHours === null ? "Planned hours: not configured" : `Planned hours: ${snapshot.plannedHours} (configured, not attendance)`,
    snapshot.recordedHours === null ? "Attendance hours: no official attendance time is recorded" : `Attendance hours: ${snapshot.recordedHours}`,
    snapshot.hoursNote,
  ];
  hourLines.forEach((line, index) => drawCentered(page, font, line, 258 - index * 14, 9, rgb(0.28, 0.32, 0.36)));

  if (snapshot.showScore && snapshot.officialScore) drawCentered(page, font, `Official exam result: ${snapshot.officialScore}`, 210, 11);
  if (snapshot.showLevel && snapshot.englishLevel) drawCentered(page, font, `Recorded English level: ${snapshot.englishLevel}`, 194, 11);
  if (snapshot.expiresAt) drawCentered(page, font, `Expires: ${snapshot.expiresAt}`, 176, 10, rgb(0.28, 0.32, 0.36));

  const sign = snapshot.signatoryName
    ? `Signed: ${snapshot.signatoryName}, ${snapshot.signatoryTitle ?? "Signatory"}`
    : "No signatory is configured.";
  page.drawText(printable(sign), { x: 48, y: 78, size: 11, font: bold, color: rgb(0.12, 0.16, 0.2) });
  page.drawText("Practice, XP, badges, and AI tutor activity are not included.", {
    x: 48, y: 58, size: 8, font, color: rgb(0.28, 0.32, 0.36),
  });
  if (snapshot.footer) page.drawText(printable(snapshot.footer).slice(0, 90), { x: 48, y: 44, size: 8, font, color: rgb(0.28, 0.32, 0.36) });

  let qrEmbedded = false;
  if (snapshot.verificationUrl && !snapshot.preview) {
    const png = await QRCode.toBuffer(snapshot.verificationUrl, { type: "png", width: 180, margin: 1, errorCorrectionLevel: "M" });
    if (!png || png.length < 100) throw new Error("QR code generation failed.");
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: width - 150, y: 42, width: 88, height: 88 });
    page.drawText("Scan to verify", { x: width - 146, y: 34, size: 8, font, color: rgb(0.28, 0.32, 0.36) });
    qrEmbedded = true;
  } else if (snapshot.preview) {
    page.drawText("PREVIEW — NOT ISSUED", { x: width - 230, y: 70, size: 12, font: bold, color: rgb(0.55, 0.15, 0.12) });
    page.drawText("This file is not a certificate.", { x: width - 230, y: 54, size: 9, font, color: rgb(0.55, 0.15, 0.12) });
  }

  if (snapshot.preview) {
    drawCentered(page, bold, "PREVIEW — NOT AN OFFICIAL CERTIFICATE", 150, 14, rgb(0.55, 0.15, 0.12));
  }

  const bytes = await pdf.save();
  if (bytes.length < 400 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("PDF generation failed the integrity check.");
  }
  if (!snapshot.preview && snapshot.certificateId && !pdfHasText(bytes, snapshot.certificateId)) {
    throw new Error("The certificate ID was not written into the PDF. Issuance stopped.");
  }
  if (!snapshot.preview && snapshot.studentName && !pdfHasText(bytes, snapshot.studentName)) {
    throw new Error("The student name was not written into the PDF. Issuance stopped.");
  }
  return { bytes, qrEmbedded };
}

function pdfHasText(bytes: Uint8Array, expected: string): boolean {
  const raw = Buffer.from(bytes);
  if (raw.includes(Buffer.from(expected))) return true;
  let index = 0;
  while ((index = raw.indexOf("stream", index)) !== -1) {
    let start = index + 6;
    if (raw[start] === 13) start += 1;
    if (raw[start] === 10) start += 1;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const text = inflateSync(raw.subarray(start, end)).toString("latin1");
      if (text.includes(expected)) return true;
      const hexes = text.match(/<([0-9A-Fa-f]+)>/g) ?? [];
      for (const hex of hexes) {
        const body = hex.slice(1, -1);
        let decoded = "";
        for (let n = 0; n < body.length; n += 2) decoded += String.fromCharCode(parseInt(body.slice(n, n + 2), 16));
        if (decoded.includes(expected)) return true;
      }
    } catch {
      // Not a compressed stream.
    }
    index = end + 9;
  }
  return false;
}

export async function renderTablePdf(title: string, lines: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const write = (text: string, size: number, useBold = false) => {
    if (y < 40) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
    }
    page.drawText(printable(text).slice(0, 110), { x: 36, y, size, font: useBold ? bold : font, color: rgb(0.12, 0.16, 0.2) });
    y -= size + 6;
  };
  write(title, 16, true);
  write("Alphabetical order. This is not a ranking.", 9);
  write("Practice, XP, badges, and AI tutor activity are not included.", 9);
  lines.forEach((line) => write(line, 9));
  return pdf.save();
}
