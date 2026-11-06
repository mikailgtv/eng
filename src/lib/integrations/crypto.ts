import crypto from "crypto";

// Production deployments must provide a dedicated secret key. Dev/test can use
// SESSION_SECRET to keep local setup convenient; there is no production fallback.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.INTEGRATION_SECRET_KEY ||
    (process.env.NODE_ENV !== "production" ? process.env.SESSION_SECRET : undefined);
  if (!secret || secret.length < 32) {
    throw new Error("INTEGRATION_SECRET_KEY must be configured with at least 32 characters before storing integration credentials.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string into a format: "enc:v1:<iv_hex>:<auth_tag_hex>:<cipher_hex>"
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `enc:v1:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a formatted secret string back to plaintext.
 */
export function decryptSecret(cipherString: string): string {
  if (!cipherString) return "";
  if (!cipherString.startsWith("enc:v1:")) {
    // If not encrypted with v1 prefix (e.g. legacy/mock), return as-is
    return cipherString;
  }

  try {
    const parts = cipherString.split(":");
    if (parts.length !== 5) {
      throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(parts[2], "hex");
    const authTag = Buffer.from(parts[3], "hex");
    const cipherText = parts[4];

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Keep the failure state detectable without copying crypto/provider details into records or responses.
    return "[DECRYPTION_ERROR]";
  }
}

/**
 * Creates a safe display hint for UI (e.g. "live_sk_••••••39a1")
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) {
    return "••••••••";
  }
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Hashes an API client secret for storage.
 */
export function hashClientSecret(secret: string): string {
  return crypto.createHash("sha256").update(`salt_eb_lms_${secret}`).digest("hex");
}

/**
 * Validates a client secret against its hash.
 */
export function verifyClientSecret(secret: string, hashed: string): boolean {
  const currentHash = hashClientSecret(secret);
  return crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(hashed));
}
