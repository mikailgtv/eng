import { URL } from "url";
import net from "net";

export interface SSRFValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

// Restricted hostnames and private/internal IP ranges (IPv4 & IPv6)
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "169.254.169.254", // Cloud provider metadata endpoint (AWS / GCP / Azure)
  "metadata",
  "instance-data",
]);

/**
 * Checks if an IPv4 or IPv6 is in a private, loopback, link-local, or cloud-metadata range.
 */
function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) return false;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (RFC 1918 Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (RFC 1918 Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (RFC 1918 Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link Local & Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // Broadcast
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;
    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Unspecified and loopback
    if (lower === "::" || lower === "::1" || lower === "0:0:0:0:0:0:0:0" || lower === "0:0:0:0:0:0:0:1") return true;
    // IPv4-mapped IPv6 addresses (URL parsing may canonicalize dotted tails to hex).
    const words = lower.split(":");
    const mappedIndex = words.lastIndexOf("ffff");
    if (mappedIndex >= 0 && words.slice(0, mappedIndex).every((word) => word === "" || word === "0") && words.length - mappedIndex === 3) {
      const high = parseInt(words[mappedIndex + 1] || "0", 16);
      const low = parseInt(words[mappedIndex + 2] || "0", 16);
      const ipv4 = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
      if (isPrivateOrReservedIp(ipv4)) return true;
    }
    const firstHextet = parseInt(lower.split(":")[0] || "0", 16);
    // fc00::/7 Unique Local and fe80::/10 Link Local
    if ((firstHextet & 0xfe00) === 0xfc00) return true;
    if ((firstHextet & 0xffc0) === 0xfe80) return true;
  }

  return false;
}

/**
 * Validates any external integration or webhook URL to prevent Server-Side Request Forgery.
 * Disallows http (optional requireHttps parameter), internal hostnames, private CIDRs, and metadata IPs.
 */
export function validateExternalUrl(urlString: string, options?: { allowHttpInDev?: boolean }): SSRFValidationResult {
  if (!urlString || typeof urlString !== "string") {
    return { isValid: false, reason: "Missing or empty URL string" };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { isValid: false, reason: "Malformed URL syntax" };
  }

  const allowHttp = options?.allowHttpInDev ?? (process.env.NODE_ENV !== "production");
  const protocol = parsed.protocol.toLowerCase();

  if (protocol !== "https:" && (!allowHttp || protocol !== "http:")) {
    return { isValid: false, reason: `Unallowed protocol '${protocol}'. Only HTTPS is permitted for enterprise integrations.` };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // 1. Direct blocklist check
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { isValid: false, reason: `Access to restricted internal/metadata host '${hostname}' is strictly forbidden.` };
  }

  // 2. IP address check
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { isValid: false, reason: `Access to private or link-local IP '${hostname}' is prohibited.` };
    }
  }

  // 3. Port check (allow standard web and mail egress ports)
  const port = parsed.port ? parseInt(parsed.port, 10) : (protocol === "https:" ? 443 : 80);
  const allowedPorts = [80, 443, 587, 465, 8080, 8443, 9443];
  if (!allowedPorts.includes(port)) {
    return { isValid: false, reason: `Port ${port} is not in the allowed integration egress port list.` };
  }

  // 4. Sanitize URL (strip credentials embedded in URL)
  parsed.username = "";
  parsed.password = "";

  return {
    isValid: true,
    sanitizedUrl: parsed.toString(),
  };
}
