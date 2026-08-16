import { z } from "zod";

const optionalDateTime = z.union([
  z.literal(""),
  z.iso.datetime({ local: true }),
]);

export const selectionQuestionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]{1,59}$/),
  label: z.string().trim().min(2).max(300),
  helpText: z.string().trim().max(500).default(""),
  kind: z.enum([
    "short_text",
    "long_text",
    "number",
    "single_choice",
    "multiple_choice",
    "url",
    "date",
    "boolean",
  ]),
  required: z.boolean().default(true),
  options: z.array(z.string().trim().min(1)).default([]),
});

export const selectionCriterionSchema = z
  .object({
    code: z.string().regex(/^[a-z][a-z0-9_]{1,59}$/),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000).default(""),
    weight: z.coerce.number().positive().max(1000),
    minScore: z.coerce.number().min(0).max(1000),
    maxScore: z.coerce.number().positive().max(1000),
  })
  .refine((item) => item.maxScore > item.minScore, {
    message: "A nota máxima deve ser maior que a mínima.",
  });

export const createSelectionCallSchema = z
  .object({
    cohortId: z.uuid(),
    code: z.string().trim().min(2).max(60),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(3).max(200),
    summary: z.string().trim().max(3000).default(""),
    applicationsOpenAt: z.iso.datetime({ local: true }),
    applicationsCloseAt: z.iso.datetime({ local: true }),
    evaluationsOpenAt: optionalDateTime,
    evaluationsCloseAt: optionalDateTime,
    appealsOpenAt: optionalDateTime,
    appealsCloseAt: optionalDateTime,
    totalVacancies: z.coerce.number().int().min(1).max(100000),
    waitlistSize: z.coerce.number().int().min(0).max(100000),
    reviewersPerApplication: z.coerce.number().int().min(1).max(15),
    divergenceThreshold: z.union([
      z.literal(""),
      z.coerce.number().min(0).max(1000),
    ]),
    quotaField: z.enum(["", "state", "city"]),
    quotaValues: z.string().trim().max(500).default(""),
    quotaPercentage: z.union([
      z.literal(""),
      z.coerce.number().min(0).max(100),
    ]),
    questions: z.array(selectionQuestionSchema).min(1),
    criteria: z.array(selectionCriterionSchema).min(1),
  })
  .refine(
    (data) =>
      new Date(data.applicationsOpenAt) < new Date(data.applicationsCloseAt),
    { message: "O encerramento deve ser posterior à abertura." },
  )
  .superRefine((data, context) => {
    const orderedStages = [
      [data.evaluationsOpenAt, data.applicationsCloseAt, "avaliações"],
      [data.evaluationsCloseAt, data.evaluationsOpenAt, "fim das avaliações"],
      [data.appealsOpenAt, data.evaluationsCloseAt, "recursos"],
      [data.appealsCloseAt, data.appealsOpenAt, "fim dos recursos"],
    ] as const;

    for (const [current, previous, label] of orderedStages) {
      if (current && (!previous || new Date(current) < new Date(previous))) {
        context.addIssue({
          code: "custom",
          message: `A etapa de ${label} está fora da ordem cronológica.`,
        });
      }
    }
  })
  .refine(
    (data) =>
      !data.quotaField ||
      (data.quotaValues.length > 0 && data.quotaPercentage !== ""),
    {
      message: "Informe os valores e o percentual da política territorial.",
    },
  );

export const publicSelectionApplicationSchema = z.object({
  applicantName: z.string().trim().min(2).max(160),
  applicantEmail: z.email().transform((value) => value.toLowerCase()),
  applicantPhone: z.string().trim().max(40).default(""),
  startupName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(200).default(""),
  taxId: z.string().trim().max(32).default(""),
  city: z.string().trim().max(120).default(""),
  state: z.string().trim().max(120).default(""),
  sector: z.string().trim().max(120).default(""),
  stage: z.enum([
    "idea",
    "validation",
    "operation",
    "traction",
    "scale",
    "graduated",
  ]),
  summary: z.string().trim().max(3000).default(""),
  answers: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  ),
});

export const publicSelectionAppealSchema = z.object({
  protocol: z
    .string()
    .trim()
    .min(10)
    .max(100)
    .transform((value) => value.toUpperCase()),
  email: z.email().transform((value) => value.toLowerCase()),
  grounds: z.string().trim().min(30).max(5000),
});

export const publicSelectionConvocationSchema = z.object({
  protocol: z
    .string()
    .trim()
    .min(10)
    .max(100)
    .transform((value) => value.toUpperCase()),
  email: z.email().transform((value) => value.toLowerCase()),
  response: z.enum(["accept", "decline"]),
});

export function defaultSelectionQuestions() {
  return [
    {
      code: "team",
      label: "Descreva a equipe, competências e dedicação ao projeto",
      helpText: "Inclua os papéis dos integrantes.",
      kind: "long_text" as const,
      required: true,
      options: [],
    },
    {
      code: "problem",
      label: "Qual problema relevante a proposta resolve?",
      helpText: "Apresente evidências do problema.",
      kind: "long_text" as const,
      required: true,
      options: [],
    },
    {
      code: "solution",
      label: "Descreva a solução e seu diferencial",
      helpText: "Explique produto, serviço ou processo.",
      kind: "long_text" as const,
      required: true,
      options: [],
    },
    {
      code: "market",
      label: "Quem são os clientes e como o mercado foi validado?",
      helpText: "Informe entrevistas, testes ou vendas.",
      kind: "long_text" as const,
      required: true,
      options: [],
    },
    {
      code: "pitch_url",
      label: "Link do vídeo pitch",
      helpText: "URL pública, se disponível.",
      kind: "url" as const,
      required: false,
      options: [],
    },
  ];
}

export function defaultSelectionCriteria() {
  return [
    {
      code: "team",
      name: "Equipe",
      description: "Capacidade, complementaridade e dedicação.",
      weight: 30,
      minScore: 1,
      maxScore: 5,
    },
    {
      code: "market",
      name: "Mercado",
      description: "Relevância do problema e validação da demanda.",
      weight: 30,
      minScore: 1,
      maxScore: 5,
    },
    {
      code: "solution",
      name: "Solução",
      description: "Proposta de valor, maturidade e diferenciação.",
      weight: 20,
      minScore: 1,
      maxScore: 5,
    },
    {
      code: "innovation",
      name: "Inovação",
      description: "Grau de novidade e potencial tecnológico.",
      weight: 20,
      minScore: 1,
      maxScore: 5,
    },
  ];
}
