import { z } from "zod";

const normalizedName = z
  .string()
  .trim()
  .min(2, "Informe um nome com pelo menos 2 caracteres.")
  .max(160, "Use no máximo 160 caracteres.");

export const createIncubatorSchema = z.object({
  organizationId: z.uuid(),
  name: normalizedName,
  timezone: z.string().trim().min(1).max(100).default("America/Sao_Paulo"),
  locale: z.string().trim().min(2).max(20).default("pt-BR"),
});

export const updateIncubatorSchema = createIncubatorSchema.extend({
  incubatorId: z.uuid(),
});

export const incubatorLifecycleSchema = z.object({
  incubatorId: z.uuid(),
  action: z.enum(["delete", "archive", "restore"]),
});

export const updateIncubatorOperationsSchema = z.object({
  description: z.string().trim().max(1200).default(""),
  contactEmail: z.union([z.literal(""), z.email()]).default(""),
  phone: z.string().trim().max(40).default(""),
  website: z.union([z.literal(""), z.url()]).default(""),
  timezone: z.string().trim().min(1).max(100),
  locale: z.string().trim().min(2).max(20),
  diagnosticsEnabled: z.boolean(),
  actionPlansEnabled: z.boolean(),
  mentoringEnabled: z.boolean(),
  learningTrailsEnabled: z.boolean(),
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
