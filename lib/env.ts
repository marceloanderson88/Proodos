import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .trim()
    .min(1)
    .default("Plataforma Sertão Maker"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
});

const supabasePublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => value.startsWith("sb_publishable_") || value.startsWith("eyJ"),
      "Use uma chave publicável do Supabase.",
    ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  input: Record<string, string | undefined>,
): PublicEnv {
  return publicEnvSchema.parse(input);
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

export function parseSupabasePublicEnv(
  input: Record<string, string | undefined>,
): SupabasePublicEnv {
  return supabasePublicEnvSchema.parse(input);
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  return parseSupabasePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
