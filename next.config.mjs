/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow preview hosts (Arena live preview) and local dev — required for Next 15 cross-origin check.
  allowedDevOrigins: ["*.e2b.app", "127.0.0.1", "localhost", "127.0.0.1:4056", "localhost:4056"],
  // Keep the memory-heavy 213-model build predictable on small CI/Netlify runners.
  experimental: { cpus: 1 },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        // Phase 43 (F-04): HSTS was missing entirely. No includeSubDomains:
        // whether sibling hostnames serve HTTPS is a deployment decision, and
        // adding it unilaterally can take unrelated internal hosts offline.
        // User agents ignore HSTS received over plain HTTP, so serving it
        // unconditionally is safe for HTTP-only development setups.
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        // Phase 43 (F-05): report-only first. An enforcing policy needs nonce
        // plumbing for Next's inline bootstrap scripts; reporting violates
        // nothing and collects the data needed to tighten the policy later.
        {
          key: "Content-Security-Policy-Report-Only",
          value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline'",
            "connect-src 'self' https: wss:",
          ].join("; "),
        },
      ],
    }];
  },
};

export default nextConfig;
