import { randomBytes } from "crypto";
import path from "path";

/**
 * Safe internal object key generation.
 * Prevents path traversal and filename-based manipulation.
 */

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]/g;

export function sanitizeFileName(name: string, maxLen = 80): string {
  const base = path.basename(name);
  const safe = base.replace(SAFE_NAME_RE, "_").slice(0, maxLen);
  // Prevent hidden files and empty names
  if (!safe || safe.startsWith(".") || safe === "_" ) {
    return `file_${randomBytes(4).toString("hex")}`;
  }
  return safe;
}

export function generateObjectKey(params: {
  resourceType: string;
  resourceId?: string | null;
  originalName: string;
  extension?: string;
}): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = sanitizeFileName(params.originalName);
  const random = randomBytes(16).toString("hex");
  const prefix = params.resourceType.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
  const sub = params.resourceId ? `${params.resourceId.replace(/[^a-zA-Z0-9_-]/g, "_")}/` : "";
  // Example: content/2026/05/abc123/<resourceId>/random-safeName
  return `${prefix}/${year}/${month}/${sub}${random}-${safe}`;
}

export function validateObjectKey(key: string): void {
  if (!key || key.length > 512) throw new Error("Invalid object key length");
  if (key.includes("..") || key.includes("\\") || path.isAbsolute(key)) {
    throw new Error("Path traversal detected in object key");
  }
  // No control chars, no leading slash
  if (/[\0-\x1F\x7F]/.test(key) || key.startsWith("/") || key.startsWith(".")) {
    throw new Error("Invalid object key format");
  }
  // Must contain at least one slash and not end with slash
  if (!key.includes("/") || key.endsWith("/")) {
    throw new Error("Object key must be a file path with directory");
  }
}

export function resolveSafePath(root: string, key: string): string {
  validateObjectKey(key);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(path.join(resolvedRoot, key));
  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    throw new Error("Path traversal detected after resolution");
  }
  return resolvedPath;
}
