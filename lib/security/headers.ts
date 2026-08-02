type SecurityHeadersOptions = {
  development?: boolean;
  supabaseUrl?: string;
};

function getLocalSupabaseOrigin(rawUrl?: string) {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    const isLocalHost = ["127.0.0.1", "localhost"].includes(url.hostname);
    return url.protocol === "http:" && isLocalHost ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function buildContentSecurityPolicy({
  development = false,
  supabaseUrl,
}: SecurityHeadersOptions = {}) {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (development) scriptSources.push("'unsafe-eval'");
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ];
  const localSupabaseOrigin = getLocalSupabaseOrigin(supabaseUrl);
  if (localSupabaseOrigin) connectSources.push(localSupabaseOrigin);

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    `connect-src ${connectSources.join(" ")}`,
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
