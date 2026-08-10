import { z } from "zod";

const uuid = z.string().uuid("Selecione um item válido.");

export const createCerneCycleSchema = z
  .object({
    name: z.string().trim().min(3).max(160),
    referenceYear: z.coerce.number().int().min(2020).max(2100),
    targetLevel: z.coerce.number().int().min(1).max(2),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
  })
  .refine((value) => value.startsOn <= value.endsOn, {
    message: "A data final deve ser posterior à inicial.",
    path: ["endsOn"],
  });

export const registerCerneEvidenceSchema = z
  .object({
    cycleId: uuid,
    practiceCode: z.string().regex(/^[12]\.[1-5]\.[1-3]$/),
    requirementId: uuid,
    title: z.string().trim().min(3).max(240),
    description: z.string().trim().max(4000).optional(),
    externalUrl: z.union([
      z.literal(""),
      z.string().url().startsWith("https://"),
    ]),
    sourceModule: z.string().trim().max(80).optional(),
    sourceEntityType: z.string().trim().max(80).optional(),
    sourceEntityId: z.union([z.literal(""), uuid]),
    scopeType: z.enum([
      "incubator",
      "program",
      "cohort",
      "startup",
      "selection_call",
    ]),
    scopeEntityId: z.union([z.literal(""), uuid]),
  })
  .refine(
    (value) => value.externalUrl || value.sourceEntityId || value.scopeEntityId,
    {
      message: "Informe um link ou selecione uma origem da plataforma.",
      path: ["externalUrl"],
    },
  );
