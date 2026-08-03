import { z } from "zod";

const normalizedName = z
  .string()
  .trim()
  .min(2, "Informe um nome com pelo menos 2 caracteres.")
  .max(160, "Use no máximo 160 caracteres.");

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((entry) => entry || null);

const optionalUrl = z
  .string()
  .trim()
  .refine((entry) => entry === "" || z.url().safeParse(entry).success, {
    message: "Informe uma URL completa, incluindo https://.",
  })
  .transform((entry) => entry || null);

const kindSchema = z.enum([
  "incubator",
  "accelerator",
  "innovation_hub",
  "innovation_center",
  "other",
]);

export const createIncubatorSchema = z
  .object({
    organizationId: z.uuid(),
    name: normalizedName,
    kind: kindSchema,
    customKind: optionalText(80),
    legalName: optionalText(200),
    shortDescription: z.string().trim().min(20).max(1200),
    contactEmail: z.email().trim().toLowerCase(),
    phone: optionalText(40),
    websiteUrl: optionalUrl,
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(120),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    responsibleName: normalizedName,
    timezone: z.string().trim().min(1).max(100).default("America/Sao_Paulo"),
    locale: z.string().trim().min(2).max(20).default("pt-BR"),
  })
  .refine(({ kind, customKind }) => kind !== "other" || customKind, {
    message: "Informe o tipo da organização apoiadora.",
    path: ["customKind"],
  });

export const updateIncubatorSchema = createIncubatorSchema.extend({
  incubatorId: z.uuid(),
});

export const incubatorLifecycleSchema = z.object({
  incubatorId: z.uuid(),
  action: z.enum(["delete", "archive", "restore"]),
});

export const updateIncubatorOperationsSchema = z
  .object({
    name: normalizedName,
    kind: kindSchema,
    customKind: optionalText(80),
    legalName: optionalText(200),
    description: z.string().trim().min(20).max(1200),
    contactEmail: z.email().trim().toLowerCase(),
    phone: optionalText(40),
    website: optionalUrl,
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(120),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    responsibleName: normalizedName,
    timezone: z.string().trim().min(1).max(100),
    locale: z.string().trim().min(2).max(20),
    diagnosticsEnabled: z.boolean(),
    actionPlansEnabled: z.boolean(),
    mentoringEnabled: z.boolean(),
    learningTrailsEnabled: z.boolean(),
  })
  .refine(({ kind, customKind }) => kind !== "other" || customKind, {
    message: "Informe o tipo da organização apoiadora.",
    path: ["customKind"],
  });

export const inviteIncubatorPersonSchema = z.object({
  invitedName: normalizedName,
  email: z.email().trim().toLowerCase(),
  roleId: z.uuid(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const invitationLifecycleSchema = z.object({
  invitationId: z.uuid(),
  action: z.enum(["revoke", "resend"]),
});

export function slugifyIncubatorName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}
