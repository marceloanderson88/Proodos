import { z } from "zod";

const deploymentEnvironmentSchema = z.object({
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  PRODUCTION_SUPABASE_PROJECT_REF: z.string().trim().min(1).optional(),
});

type DeploymentEnvironment = z.infer<typeof deploymentEnvironmentSchema>;

function getSupabaseProjectRef(value: string | undefined) {
  if (!value) return undefined;
  const hostname = new URL(value).hostname;
  const suffix = ".supabase.co";
  return hostname.endsWith(suffix)
    ? hostname.slice(0, -suffix.length)
    : undefined;
}

export function validateDeploymentEnvironment(
  input: Record<string, string | undefined>,
) {
  const parsed = deploymentEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, reason: "invalid_environment" as const };
  }

  const environment: DeploymentEnvironment = parsed.data;
  if (
    environment.VERCEL_ENV === "production" &&
    environment.NEXT_PUBLIC_APP_ENV !== "production"
  ) {
    return {
      success: false as const,
      reason: "production_label_mismatch" as const,
    };
  }

  if (environment.VERCEL_ENV === "preview") {
    if (environment.NEXT_PUBLIC_APP_ENV !== "staging") {
      return {
        success: false as const,
        reason: "preview_label_mismatch" as const,
      };
    }
    if (!environment.PRODUCTION_SUPABASE_PROJECT_REF) {
      return {
        success: false as const,
        reason: "production_ref_missing" as const,
      };
    }
    const currentProjectRef = getSupabaseProjectRef(
      environment.NEXT_PUBLIC_SUPABASE_URL,
    );
    if (!currentProjectRef) {
      return {
        success: false as const,
        reason: "preview_project_invalid" as const,
      };
    }
    if (currentProjectRef === environment.PRODUCTION_SUPABASE_PROJECT_REF) {
      return {
        success: false as const,
        reason: "preview_uses_production" as const,
      };
    }
  }

  return { success: true as const };
}

export function assertSafeDeploymentEnvironment(
  input: Record<string, string | undefined>,
) {
  const result = validateDeploymentEnvironment(input);
  if (!result.success) {
    throw new Error(`Unsafe deployment environment: ${result.reason}`);
  }
}
