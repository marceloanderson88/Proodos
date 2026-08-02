import { z } from "zod";

export const fileStatuses = [
  "pending",
  "uploading",
  "validating",
  "available",
  "quarantined",
  "failed",
  "trash_pending",
  "trashed",
  "restore_pending",
  "missing",
  "purge_pending",
  "purged",
] as const;

export const fileStatusSchema = z.enum(fileStatuses);
export type FileStatus = z.infer<typeof fileStatusSchema>;

export const fileClassificationSchema = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
]);
export type FileClassification = z.infer<typeof fileClassificationSchema>;

const fileNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do arquivo.")
  .max(255, "O nome pode ter no máximo 255 caracteres.")
  .refine(
    (value) => !/[\u0000-\u001f]/.test(value),
    "O nome contém caracteres inválidos.",
  );

const mimeTypeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .regex(
    /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/,
    "MIME type inválido.",
  );

export const fileScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("organization") }),
  z.object({ type: z.literal("unit"), unitId: z.uuid() }),
  z.object({ type: z.literal("incubator"), incubatorId: z.uuid() }),
]);
export type FileScope = z.infer<typeof fileScopeSchema>;

export const uploadSessionRequestSchema = z.object({
  organizationSlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  originalName: fileNameSchema,
  displayName: fileNameSchema.optional(),
  mimeType: mimeTypeSchema,
  expectedSizeBytes: z.number().int().positive().safe(),
  classification: fileClassificationSchema.default("internal"),
  idempotencyKey: z
    .string()
    .min(16)
    .max(160)
    .regex(/^[A-Za-z0-9._:-]+$/),
  scope: fileScopeSchema,
});

export const createUploadSessionInputSchema = uploadSessionRequestSchema
  .omit({ organizationSlug: true })
  .extend({
    organizationId: z.uuid(),
    userId: z.uuid(),
  });
export type CreateUploadSessionInput = z.infer<
  typeof createUploadSessionInputSchema
>;

export const completeUploadInputSchema = z.object({
  fileId: z.uuid(),
  sessionId: z.uuid(),
  providerFileId: z.string().trim().min(1).max(255),
  providerDriveId: z.string().trim().min(1).max(255),
  providerRevisionId: z.string().trim().min(1).max(255).optional(),
  mimeType: mimeTypeSchema,
  sizeBytes: z.number().int().nonnegative().safe(),
  checksum: z
    .object({
      algorithm: z.enum(["md5", "sha256"]),
      value: z.string().regex(/^[0-9a-f]{32,64}$/),
    })
    .optional(),
});
export type CompleteUploadInput = z.infer<typeof completeUploadInputSchema>;

export const authorizedAccessInputSchema = z.object({
  fileId: z.uuid(),
  userId: z.uuid(),
  operation: z.enum(["preview", "download"]),
});
export type AuthorizedAccessInput = z.infer<typeof authorizedAccessInputSchema>;

export const fileOperationInputSchema = z.object({
  fileId: z.uuid(),
  userId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
});
export type FileOperationInput = z.infer<typeof fileOperationInputSchema>;

export const reconcileInputSchema = z.object({
  organizationId: z.uuid(),
  limit: z.number().int().min(1).max(500).default(100),
});
export type ReconcileInput = z.infer<typeof reconcileInputSchema>;

export type UploadSession = {
  id: string;
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
  expectedSizeBytes: number;
};

export type StoredFileMetadata = {
  fileId: string;
  providerFileId: string;
  providerDriveId: string;
  status: "available";
  sizeBytes: number;
  mimeType: string;
};

export type AuthorizedAccess = {
  fileId: string;
  url: string;
  expiresAt: string;
  disposition: "inline" | "attachment";
};

export type ReconcileResult = {
  checked: number;
  repaired: number;
  missing: number;
  failed: number;
};
