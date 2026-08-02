import { z } from "zod";

const fileIntegrationEnvSchema = z.object({
  GOOGLE_DRIVE_UPLOAD_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type FileIntegrationConfig = z.infer<typeof fileIntegrationEnvSchema>;

export function parseFileIntegrationConfig(
  input: Record<string, string | undefined>,
): FileIntegrationConfig {
  return fileIntegrationEnvSchema.parse(input);
}
