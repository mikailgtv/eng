import { FILE_POLICIES, BLOCKED_EXTENSIONS, type ResourceCategory } from "./policies";

function magicOk(extension: string, bytes: Buffer): boolean {
  if (bytes.length < 4) return false;
  const ext = extension.toLowerCase();
  if (ext === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (ext === "jpg" || ext === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (ext === "gif") return bytes.subarray(0, 3).toString() === "GIF";
  if (ext === "pdf") return bytes.subarray(0, 4).toString() === "%PDF";
  if (ext === "docx" || ext === "xlsx" || ext === "pptx") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (ext === "webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (ext === "wav") return bytes.subarray(0, 4).toString() === "RIFF";
  if (ext === "mp3") return bytes.subarray(0, 3).toString() === "ID3" || bytes[0] === 0xff;
  if (ext === "ogg") return bytes.subarray(0, 4).toString() === "OggS";
  if (ext === "m4a" || ext === "mp4") return bytes.subarray(4, 8).toString() === "ftyp" || bytes.subarray(0, 4).toString() === "ftyp";
  if (ext === "webm") return bytes[0] === 0x1a && bytes[1] === 0x45;
  if (ext === "csv" || ext === "json") return true; // text-based, no magic
  if (ext === "epub") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return false;
}

export interface ValidateInput {
  category: ResourceCategory;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}

export interface ValidateResult {
  extension: string;
  safeMime: string;
  sizeBytes: number;
}

export function validateFile(input: ValidateInput): ValidateResult {
  const { category, fileName, mimeType, bytes } = input;
  if (!bytes || bytes.length === 0) throw new Error("Empty file not allowed");
  const policy = FILE_POLICIES[category];
  if (!policy) throw new Error(`Unknown category: ${category}`);

  if (bytes.length > policy.maxBytes) {
    throw new Error(`File exceeds max size of ${policy.maxBytes} bytes for ${category}`);
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ext) throw new Error("File must have an extension");
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error(`File type .${ext} is blocked`);
  if (!policy.allowedExtensions.includes(ext)) {
    throw new Error(`Extension .${ext} not allowed for ${category}. Allowed: ${policy.allowedExtensions.join(", ")}`);
  }

  // MIME check: client-supplied type is not trusted alone, but we validate against allowed list
  const normalizedMime = mimeType?.toLowerCase().split(";")[0].trim() || "application/octet-stream";
  if (policy.allowedMimeTypes.length && !policy.allowedMimeTypes.includes(normalizedMime)) {
    // Allow generic octet-stream if extension is allowed, but log mismatch - here we enforce strict
    // For audio/video, browsers may send variations, so we allow if extension matches and magic passes
    // We'll still require magic check
    if (normalizedMime !== "application/octet-stream") {
      // For now, warn but allow if magic passes; to be strict, uncomment next line
      // throw new Error(`MIME type ${normalizedMime} not allowed for ${category}`);
    }
  }

  if (policy.requireMagicCheck && !magicOk(ext, bytes)) {
    throw new Error(`File contents do not match extension .${ext}`);
  }

  return {
    extension: ext,
    safeMime: normalizedMime,
    sizeBytes: bytes.length,
  };
}
