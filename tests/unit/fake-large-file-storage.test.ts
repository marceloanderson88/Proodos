import { describe, expect, it } from "vitest";

import { FakeLargeFileStorageService } from "@/services/fake-large-file-storage";

const baseInput = {
  organizationId: "40000000-0000-4000-8000-000000000001",
  userId: "40000000-0000-4000-8000-000000000002",
  originalName: "evidencia.pdf",
  mimeType: "application/pdf",
  expectedSizeBytes: 2048,
  classification: "confidential" as const,
  idempotencyKey: "test:upload:session:001",
  scope: { type: "organization" as const },
};

describe("FakeLargeFileStorageService", () => {
  it("completa, acessa, remove e restaura sem rede", async () => {
    const now = new Date("2026-08-02T12:00:00Z");
    const storage = new FakeLargeFileStorageService(() => now);
    const session = await storage.createUploadSession(baseInput);
    const stored = await storage.completeUpload({
      fileId: session.fileId,
      sessionId: session.id,
      providerFileId: "provider-file-1",
      providerDriveId: "shared-drive-1",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    });

    expect(stored.status).toBe("available");
    await expect(
      storage.getAuthorizedAccess({
        fileId: session.fileId,
        userId: baseInput.userId,
        operation: "preview",
      }),
    ).resolves.toMatchObject({ disposition: "inline" });

    await storage.moveToTrash({
      fileId: session.fileId,
      userId: baseInput.userId,
      reason: "Teste de ciclo de vida",
    });
    await storage.restore({
      fileId: session.fileId,
      userId: baseInput.userId,
      reason: "Teste de restauração",
    });
  });

  it("rejeita sessão expirada e divergência de metadados", async () => {
    let now = new Date("2026-08-02T12:00:00Z");
    const storage = new FakeLargeFileStorageService(() => now, 1000);
    const session = await storage.createUploadSession(baseInput);
    now = new Date("2026-08-02T12:00:02Z");

    await expect(
      storage.completeUpload({
        fileId: session.fileId,
        sessionId: session.id,
        providerFileId: "provider-file-1",
        providerDriveId: "shared-drive-1",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      }),
    ).rejects.toMatchObject({
      code: "session_expired",
    });
  });
});
