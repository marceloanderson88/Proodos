import { z } from "zod";

export const createDiagnosticTemplateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).default(""),
  instructions: z.string().trim().max(3000).default(""),
});

export const createDiagnosticDimensionSchema = z.object({
  templateId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(800).default(""),
  weight: z.coerce.number().positive().max(100),
});

export const createDiagnosticCriterionSchema = z.object({
  templateId: z.uuid(),
  dimensionId: z.uuid(),
  prompt: z.string().trim().min(3).max(500),
  helpText: z.string().trim().max(800).default(""),
  responseType: z.enum([
    "numeric",
    "text",
    "single_choice",
    "currency",
    "percentage",
    "date",
    "link",
    "file",
  ]),
  weight: z.coerce.number().positive().max(100),
  maximumScore: z.coerce.number().positive().max(100),
  allowsNotApplicable: z.boolean(),
  options: z.string().trim().max(1200).default(""),
});

export const createDiagnosticAssessmentSchema = z.object({
  startupId: z.uuid(),
  templateId: z.uuid(),
  cycleLabel: z.string().trim().min(2).max(120),
});

export const saveDiagnosticResponseSchema = z
  .object({
    assessmentId: z.uuid(),
    criterionId: z.uuid(),
    responseType: z.enum([
      "numeric",
      "text",
      "single_choice",
      "currency",
      "percentage",
      "date",
      "link",
      "file",
    ]),
    value: z.string().trim().max(4000),
    comment: z.string().trim().max(2000).default(""),
    evidenceNotes: z.string().trim().max(2000).default(""),
    isNotApplicable: z.boolean(),
    notApplicableJustification: z.string().trim().max(1200).default(""),
  })
  .superRefine((data, context) => {
    if (data.isNotApplicable && !data.notApplicableJustification) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableJustification"],
        message: "Justifique por que o critério não se aplica.",
      });
    }
    if (!data.isNotApplicable && !data.value) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Informe uma resposta.",
      });
    }
  });

export const validateDiagnosticResponseSchema = z.object({
  assessmentId: z.uuid(),
  responseId: z.uuid(),
  criterionId: z.uuid(),
  score: z.coerce.number().min(0).max(100),
  evaluatorComment: z.string().trim().min(2).max(2000),
});
