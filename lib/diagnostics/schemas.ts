import { z } from "zod";

export const createDiagnosticTemplateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).default(""),
  instructions: z.string().trim().max(3000).default(""),
});

export const createDiagnosticDimensionSchema = z.object({
  templateId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z][A-Za-z0-9]{0,9}$/, "Use até 10 letras ou números."),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(800).default(""),
  weight: z.coerce.number().positive().max(100),
  isEssential: z.boolean(),
});

export const updateDiagnosticDimensionSchema =
  createDiagnosticDimensionSchema.extend({ dimensionId: z.uuid() });

export const deleteDiagnosticDimensionSchema = z.object({
  templateId: z.uuid(),
  dimensionId: z.uuid(),
});

export const reorderDiagnosticDimensionsSchema = z.object({
  templateId: z.uuid(),
  dimensionIds: z.array(z.uuid()).min(1),
});

export const createDiagnosticCriterionSchema = z.object({
  templateId: z.uuid(),
  dimensionId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z][A-Za-z0-9]{0,11}$/, "Use até 12 letras ou números."),
  prompt: z.string().trim().min(3).max(500),
  helpText: z.string().trim().max(800).default(""),
  weight: z.coerce.number().positive().max(100),
  allowsNotApplicable: z.boolean(),
  requiresNotApplicableJustification: z.boolean(),
  evidenceRequiredFrom: z.union([
    z.literal(""),
    z.coerce.number().min(0).max(4),
  ]),
  rubric0: z.string().trim().min(2).max(2000),
  rubric1: z.string().trim().min(2).max(2000),
  rubric2: z.string().trim().min(2).max(2000),
  rubric3: z.string().trim().min(2).max(2000),
  rubric4: z.string().trim().min(2).max(2000),
});

export const updateDiagnosticCriterionSchema =
  createDiagnosticCriterionSchema.extend({ criterionId: z.uuid() });

export const deleteDiagnosticCriterionSchema = z.object({
  templateId: z.uuid(),
  criterionId: z.uuid(),
});

export const reorderDiagnosticCriteriaSchema = z.object({
  templateId: z.uuid(),
  dimensionId: z.uuid(),
  criterionIds: z.array(z.uuid()).min(1),
});

export const duplicateDiagnosticTemplateSchema = z.object({
  templateId: z.uuid(),
  versionLabel: z.string().trim().max(40).default(""),
  changelog: z.string().trim().max(3000).default(""),
});

export const diagnosticAssessmentTransitionSchema = z.object({
  assessmentId: z.uuid(),
  returnTo: z.string().trim().min(1).max(500),
});

export const createDiagnosticAssessmentSchema = z.object({
  startupId: z.uuid(),
  templateId: z.uuid(),
  cycleLabel: z.string().trim().min(2).max(120),
});

export const updatePendingDiagnosticAssessmentSchema = z.object({
  assessmentId: z.uuid(),
  campaignId: z.uuid(),
  cycleLabel: z.string().trim().min(2).max(120),
  dueAt: z.coerce.date(),
  evaluatorId: z.union([z.literal(""), z.uuid()]).default(""),
});

export const deletePendingDiagnosticAssessmentSchema = z.object({
  assessmentId: z.uuid(),
  campaignId: z.uuid(),
});

export const deleteDiagnosticTemplateSchema = z.object({
  templateId: z.uuid(),
});

export const assignDiagnosticRespondentSchema = z.object({
  assessmentId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(["primary", "collaborator", "viewer"]),
  returnTo: z.string().trim().min(1).max(500),
});

export const revokeDiagnosticRespondentSchema = z.object({
  assessmentId: z.uuid(),
  userId: z.uuid(),
  returnTo: z.string().trim().min(1).max(500),
});

export const assignDiagnosticEvaluatorSchema = z.object({
  assessmentId: z.uuid(),
  userId: z.uuid(),
  returnTo: z.string().trim().min(1).max(500),
});

export const inviteDiagnosticRespondentSchema = z.object({
  assessmentId: z.uuid(),
  invitedName: z.string().trim().min(2).max(160),
  email: z.email().trim().toLowerCase().max(320),
  roleId: z.uuid(),
  respondentRole: z.enum(["primary", "collaborator", "viewer"]),
  returnTo: z.string().trim().min(1).max(500),
});

export const manageDiagnosticRespondentInvitationSchema = z.object({
  assessmentId: z.uuid(),
  invitationId: z.uuid(),
  action: z.enum(["resend", "revoke"]),
  returnTo: z.string().trim().min(1).max(500),
});

export const createDiagnosticCampaignSchema = z
  .object({
    name: z.string().trim().min(2).max(180),
    templateId: z.uuid(),
    programId: z.union([z.literal(""), z.uuid()]).default(""),
    cohortId: z.union([z.literal(""), z.uuid()]).default(""),
    evaluatorId: z.union([z.literal(""), z.uuid()]).default(""),
    executionMode: z.enum(["self_assessment", "facilitated"]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    startupIds: z.array(z.uuid()).min(1, "Selecione ao menos uma startup."),
    communicationSubject: z.string().trim().max(200).default(""),
    communicationMessage: z.string().trim().max(5000).default(""),
  })
  .refine((data) => data.startsAt < data.endsAt, {
    path: ["endsAt"],
    message: "O encerramento deve ser posterior ao início.",
  })
  .refine((data) => !data.cohortId || Boolean(data.programId), {
    path: ["programId"],
    message: "Selecione o programa da turma.",
  })
  .refine(
    (data) => data.executionMode !== "facilitated" || Boolean(data.evaluatorId),
    {
      path: ["evaluatorId"],
      message: "Selecione quem conduzirá o diagnóstico.",
    },
  );

export const addDiagnosticAssessmentNoteSchema = z.object({
  assessmentId: z.uuid(),
  body: z.string().trim().min(2).max(4000),
  returnTo: z.string().trim().min(1).max(500),
});

export const installDiagnosticDemoCasesSchema = z.object({
  confirmation: z.literal("INSTALL_DEMOS"),
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

export const addDiagnosticExternalEvidenceSchema = z.object({
  responseId: z.uuid(),
  label: z.string().trim().min(2).max(200),
  externalUrl: z.url().startsWith("https://").max(2048),
  returnTo: z.string().trim().min(1).max(500),
});

export const autosaveDiagnosticResponseSchema =
  saveDiagnosticResponseSchema.safeExtend({
    lockVersion: z.coerce.number().int().nonnegative(),
  });

export const deleteDiagnosticEvidenceSchema = z.object({
  evidenceId: z.uuid(),
  returnTo: z.string().trim().min(1).max(500),
});

export const saveDiagnosticIndicatorValueSchema = z
  .object({
    assessmentId: z.uuid(),
    indicatorDefinitionId: z.uuid(),
    lockVersion: z.coerce.number().int().nonnegative(),
    numericValue: z.string().trim().max(80),
    targetValue: z.string().trim().max(80),
    evidenceNotes: z.string().trim().max(2000),
    isNotApplicable: z.boolean(),
    notApplicableJustification: z.string().trim().max(1200),
  })
  .superRefine((data, context) => {
    if (!data.isNotApplicable && !data.numericValue) {
      context.addIssue({
        code: "custom",
        path: ["numericValue"],
        message: "Informe o valor do indicador.",
      });
    }
    if (data.isNotApplicable && !data.notApplicableJustification) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableJustification"],
        message: "Justifique por que o indicador não se aplica.",
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
