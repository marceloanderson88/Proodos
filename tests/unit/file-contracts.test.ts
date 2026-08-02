import { describe, expect, it } from "vitest";

import {
  completeUploadInputSchema,
  uploadSessionRequestSchema,
} from "@/features/files/contracts";
import { parseFileIntegrationConfig } from "@/features/files/config";

describe("contratos de arquivos", () => {
  it("normaliza MIME e preserva escopo tipado", () => {
    const result = uploadSessionRequestSchema.parse({
      organizationSlug: "sertao-maker",
      originalName: " plano.pdf ",
      mimeType: "APPLICATION/PDF",
      expectedSizeBytes: 1024,
      idempotencyKey: "upload:2026:arquivo:1",
      scope: { type: "organization" },
    });

    expect(result.originalName).toBe("plano.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.classification).toBe("internal");
  });

  it("rejeita tamanho inseguro e checksum malformado", () => {
    expect(() =>
      completeUploadInputSchema.parse({
        fileId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        providerFileId: "drive-file",
        providerDriveId: "shared-drive",
        mimeType: "application/pdf",
        sizeBytes: Number.MAX_SAFE_INTEGER + 1,
        checksum: { algorithm: "sha256", value: "não-é-hex" },
      }),
    ).toThrow();
  });

  it("mantém a integração real desativada por padrão", () => {
    expect(parseFileIntegrationConfig({}).GOOGLE_DRIVE_UPLOAD_ENABLED).toBe(
      false,
    );
    expect(
      parseFileIntegrationConfig({ GOOGLE_DRIVE_UPLOAD_ENABLED: "true" })
        .GOOGLE_DRIVE_UPLOAD_ENABLED,
    ).toBe(true);
  });
});
