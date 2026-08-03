import type { NextConfig } from "next";

import { assertSafeDeploymentEnvironment } from "./lib/security/deployment-environment";
import { getSecurityHeaders } from "./lib/security/headers";

// Produção continua falhando de forma fechada quando os rótulos divergem.
// Previews inseguros precisam concluir o build para o Vercel registrar o
// deployment; o proxy os bloqueia antes de qualquer acesso ao Supabase.
if (process.env.VERCEL_ENV !== "preview") {
  assertSafeDeploymentEnvironment({
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    PRODUCTION_SUPABASE_PROJECT_REF:
      process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders({
          development: process.env.NODE_ENV === "development",
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }),
      },
    ];
  },
};

export default nextConfig;
