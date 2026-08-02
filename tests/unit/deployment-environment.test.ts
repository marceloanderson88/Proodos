import { describe, expect, it } from "vitest";

import { validateDeploymentEnvironment } from "@/lib/security/deployment-environment";

describe("validateDeploymentEnvironment", () => {
  it("aceita produção rotulada corretamente", () => {
    expect(
      validateDeploymentEnvironment({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_APP_ENV: "production",
      }),
    ).toEqual({ success: true });
  });

  it("bloqueia preview ligado ao projeto de produção", () => {
    expect(
      validateDeploymentEnvironment({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_APP_ENV: "staging",
        NEXT_PUBLIC_SUPABASE_URL: "https://prodref.supabase.co",
        PRODUCTION_SUPABASE_PROJECT_REF: "prodref",
      }),
    ).toEqual({ success: false, reason: "preview_uses_production" });
  });

  it("aceita preview isolado e explicitamente rotulado", () => {
    expect(
      validateDeploymentEnvironment({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_APP_ENV: "staging",
        NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co",
        PRODUCTION_SUPABASE_PROJECT_REF: "prodref",
      }),
    ).toEqual({ success: true });
  });
});
