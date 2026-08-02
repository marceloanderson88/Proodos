type SecurityHeadersOptions = {
  development?: boolean;
};

export function buildContentSecurityPolicy({
  development = false,
}: SecurityHeadersOptions = {}) {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (development) scriptSources.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function getSecurityHeaders(
  options: SecurityHeadersOptions = {},
): Array<{ key: string; value: string }> {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
