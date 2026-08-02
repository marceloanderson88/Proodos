import "server-only";

import { parseFileIntegrationConfig } from "@/features/files/config";

export function getFileIntegrationConfig() {
  return parseFileIntegrationConfig({
    GOOGLE_DRIVE_UPLOAD_ENABLED: process.env.GOOGLE_DRIVE_UPLOAD_ENABLED,
  });
}
