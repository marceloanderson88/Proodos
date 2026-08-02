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

export interface LargeFileStorageService {
  createUploadSession(input: CreateUploadSessionInput): Promise<UploadSession>;
  completeUpload(input: CompleteUploadInput): Promise<StoredFileMetadata>;
  getAuthorizedAccess(input: AuthorizedAccessInput): Promise<AuthorizedAccess>;
  moveToTrash(input: FileOperationInput): Promise<void>;
  restore(input: FileOperationInput): Promise<void>;
  reconcile(input: ReconcileInput): Promise<ReconcileResult>;
}

export class StorageContractError extends Error {
  constructor(
    public readonly code:
      | "file_not_found"
      | "session_not_found"
      | "session_expired"
      | "metadata_mismatch"
      | "file_not_available"
      | "invalid_state",
    message: string,
  ) {
    super(message);
    this.name = "StorageContractError";
  }
}
