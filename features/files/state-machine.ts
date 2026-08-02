import type { FileStatus } from "@/features/files/contracts";

const transitions: Readonly<Record<FileStatus, readonly FileStatus[]>> = {
  pending: ["uploading", "failed"],
  uploading: ["validating", "failed"],
  validating: ["available", "quarantined", "failed"],
  available: ["trash_pending", "missing", "quarantined"],
  quarantined: ["validating", "trash_pending", "failed"],
  failed: ["pending"],
  trash_pending: ["trashed", "available", "failed"],
  trashed: ["restore_pending", "purge_pending"],
  restore_pending: ["available", "missing", "failed"],
  missing: ["restore_pending", "purge_pending", "failed"],
  purge_pending: ["purged", "trashed", "failed"],
  purged: [],
};

export function canTransitionFile(
  current: FileStatus,
  next: FileStatus,
): boolean {
  return transitions[current].includes(next);
}

export function assertFileTransition(
  current: FileStatus,
  next: FileStatus,
): void {
  if (!canTransitionFile(current, next)) {
    throw new FileStateTransitionError(current, next);
  }
}

export class FileStateTransitionError extends Error {
  constructor(
    public readonly current: FileStatus,
    public readonly next: FileStatus,
  ) {
    super(`Transição de arquivo inválida: ${current} -> ${next}`);
    this.name = "FileStateTransitionError";
  }
}
