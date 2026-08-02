import type {
  AuthorizedAccess,
  AuthorizedAccessInput,
  CompleteUploadInput,
  CreateUploadSessionInput,
  FileOperationInput,
  ReconcileInput,
  ReconcileResult,
  StoredFileMetadata,
  UploadSession,
} from "@/features/files/contracts";
import type { FileStatus } from "@/features/files/contracts";
import { assertFileTransition } from "@/features/files/state-machine";
import {
  type LargeFileStorageService,
  StorageContractError,
} from "@/services/large-file-storage";

type FakeFile = {
  fileId: string;
  mimeType: string;
  expectedSizeBytes: number;
  status: FileStatus;
  providerFileId?: string;
  providerDriveId?: string;
  sizeBytes?: number;
};

type FakeSession = UploadSession & { completed: boolean };

export class FakeLargeFileStorageService implements LargeFileStorageService {
  private readonly files = new Map<string, FakeFile>();
  private readonly sessions = new Map<string, FakeSession>();

  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly sessionTtlMs = 60 * 60 * 1000,
  ) {}

  async createUploadSession(
    input: CreateUploadSessionInput,
  ): Promise<UploadSession> {
    const fileId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(this.now().getTime() + this.sessionTtlMs);
    const session: FakeSession = {
      id: sessionId,
      fileId,
      uploadUrl: `https://upload.invalid/session/${sessionId}`,
      expiresAt: expiresAt.toISOString(),
      expectedSizeBytes: input.expectedSizeBytes,
      completed: false,
    };

    this.files.set(fileId, {
      fileId,
      mimeType: input.mimeType,
      expectedSizeBytes: input.expectedSizeBytes,
      status: "pending",
    });
    this.sessions.set(sessionId, session);
    return session;
  }

  async completeUpload(
    input: CompleteUploadInput,
  ): Promise<StoredFileMetadata> {
    const file = this.files.get(input.fileId);
    const session = this.sessions.get(input.sessionId);
    if (!file)
      throw new StorageContractError("file_not_found", "Arquivo inexistente.");
    if (!session || session.fileId !== input.fileId) {
      throw new StorageContractError(
        "session_not_found",
        "Sessão inexistente.",
      );
    }
    if (new Date(session.expiresAt).getTime() <= this.now().getTime()) {
      throw new StorageContractError("session_expired", "Sessão expirada.");
    }
    if (
      input.sizeBytes !== file.expectedSizeBytes ||
      input.mimeType !== file.mimeType
    ) {
      throw new StorageContractError(
        "metadata_mismatch",
        "Os metadados finais divergem da solicitação.",
      );
    }

    if (file.status !== "available") {
      assertFileTransition(file.status, "uploading");
      file.status = "uploading";
      assertFileTransition(file.status, "validating");
      file.status = "validating";
      assertFileTransition(file.status, "available");
      file.status = "available";
      file.providerFileId = input.providerFileId;
      file.providerDriveId = input.providerDriveId;
      file.sizeBytes = input.sizeBytes;
      session.completed = true;
    }

    return {
      fileId: file.fileId,
      providerFileId: file.providerFileId ?? input.providerFileId,
      providerDriveId: file.providerDriveId ?? input.providerDriveId,
      status: "available",
      sizeBytes: file.sizeBytes ?? input.sizeBytes,
      mimeType: file.mimeType,
    };
  }

  async getAuthorizedAccess(
    input: AuthorizedAccessInput,
  ): Promise<AuthorizedAccess> {
    const file = this.files.get(input.fileId);
    if (!file)
      throw new StorageContractError("file_not_found", "Arquivo inexistente.");
    if (file.status !== "available") {
      throw new StorageContractError(
        "file_not_available",
        "Arquivo indisponível.",
      );
    }
    return {
      fileId: file.fileId,
      url: `https://access.invalid/file/${file.fileId}`,
      expiresAt: new Date(this.now().getTime() + 5 * 60 * 1000).toISOString(),
      disposition: input.operation === "preview" ? "inline" : "attachment",
    };
  }

  async moveToTrash(input: FileOperationInput): Promise<void> {
    const file = this.files.get(input.fileId);
    if (!file)
      throw new StorageContractError("file_not_found", "Arquivo inexistente.");
    if (file.status !== "available") {
      throw new StorageContractError(
        "invalid_state",
        "Arquivo não pode ser removido.",
      );
    }
    assertFileTransition(file.status, "trash_pending");
    file.status = "trash_pending";
    assertFileTransition(file.status, "trashed");
    file.status = "trashed";
  }

  async restore(input: FileOperationInput): Promise<void> {
    const file = this.files.get(input.fileId);
    if (!file)
      throw new StorageContractError("file_not_found", "Arquivo inexistente.");
    if (file.status !== "trashed") {
      throw new StorageContractError(
        "invalid_state",
        "Arquivo não pode ser restaurado.",
      );
    }
    assertFileTransition(file.status, "restore_pending");
    file.status = "restore_pending";
    assertFileTransition(file.status, "available");
    file.status = "available";
  }

  async reconcile(input: ReconcileInput): Promise<ReconcileResult> {
    const checked = Math.min(this.files.size, input.limit);
    return { checked, repaired: 0, missing: 0, failed: 0 };
  }
}
