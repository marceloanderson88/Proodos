import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? null : value),
  z
    .string()
    .url("Informe uma URL válida.")
    .max(2048)
    .refine(
      (value) => /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//.test(value),
      "Use uma URL de perfil do LinkedIn.",
    )
    .nullable(),
);

const skillListSchema = z
  .array(z.string().trim().min(2).max(80))
  .max(12, "Informe no máximo 12 itens.")
  .transform((items) => {
    const unique = new Map<string, string>();
    for (const item of items) {
      const key = item.toLocaleLowerCase("pt-BR");
      if (!unique.has(key)) unique.set(key, item);
    }
    return [...unique.values()];
  });

export const createMentorProfileSchema = z.object({
  userId: z.string().uuid(),
  headline: z.string().trim().min(3).max(160),
  bio: z.string().trim().min(20).max(2000),
  timezone: z.string().trim().min(1).max(100),
  linkedinUrl: optionalUrl,
  specialties: skillListSchema.refine((items) => items.length >= 1, {
    message: "Informe ao menos uma especialidade.",
  }),
  segments: skillListSchema,
});

export const updateMentorProfileSchema = createMentorProfileSchema.extend({
  profileId: z.string().uuid(),
});

export const createMentorAssignmentSchema = z
  .object({
    mentorProfileId: z.string().uuid(),
    startupId: z.string().uuid(),
    startsOn: z.string().date(),
    endsOn: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().date().nullable(),
    ),
    focus: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().trim().min(3).max(1000).nullable(),
    ),
  })
  .refine(({ startsOn, endsOn }) => !endsOn || startsOn <= endsOn, {
    message: "A data final deve ser igual ou posterior à inicial.",
    path: ["endsOn"],
  });

export const updateMentorAssignmentStatusSchema = z.object({
  assignmentId: z.string().uuid(),
  action: z.enum(["pause", "resume", "end"]),
});

export const updateMentorProfileStatusSchema = z.object({
  profileId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

const optionalUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable(),
);

export const createMentorAvailabilitySchema = z
  .object({
    mentorProfileId: z.string().uuid(),
    weekday: z.coerce.number().int().min(0).max(6),
    startsAt: z.string().regex(/^\d{2}:\d{2}$/),
    endsAt: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().trim().min(1).max(100),
    effectiveFrom: z.string().date(),
    effectiveUntil: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().date().nullable(),
    ),
  })
  .refine(({ startsAt, endsAt }) => startsAt < endsAt, {
    message: "O horário final deve ser posterior ao inicial.",
    path: ["endsAt"],
  })
  .refine(
    ({ effectiveFrom, effectiveUntil }) =>
      !effectiveUntil || effectiveFrom <= effectiveUntil,
    {
      message: "A vigência final deve ser posterior à inicial.",
      path: ["effectiveUntil"],
    },
  );

export const deleteMentorAvailabilitySchema = z.object({
  availabilityId: z.string().uuid(),
});

export const createMentoringSessionSchema = z
  .object({
    assignmentId: z.string().uuid(),
    diagnosticAssessmentId: optionalUuid,
    objective: z.string().trim().min(5).max(1000),
    mode: z.enum(["remote", "in_person", "hybrid"]),
    timezone: z.string().trim().min(1).max(100),
    scheduledStartAt: z.preprocess(
      (value) => (value === "" ? null : value),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        .nullable(),
    ),
    scheduledEndAt: z.preprocess(
      (value) => (value === "" ? null : value),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        .nullable(),
    ),
    meetingUrl: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().url().max(2048).nullable(),
    ),
    location: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().trim().min(3).max(500).nullable(),
    ),
  })
  .refine(
    ({ scheduledStartAt, scheduledEndAt }) =>
      Boolean(scheduledStartAt) === Boolean(scheduledEndAt),
    { message: "Informe início e fim da sessão.", path: ["scheduledEndAt"] },
  )
  .refine(
    ({ scheduledStartAt, scheduledEndAt }) =>
      !scheduledStartAt || !scheduledEndAt || scheduledStartAt < scheduledEndAt,
    {
      message: "O término deve ser posterior ao início.",
      path: ["scheduledEndAt"],
    },
  );

export const updateMentoringSessionStatusSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  reason: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().min(3).max(1000).nullable(),
  ),
});

export const rescheduleMentoringSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    timezone: z.string().trim().min(1).max(100),
    scheduledStartAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    scheduledEndAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  })
  .refine(
    ({ scheduledStartAt, scheduledEndAt }) => scheduledStartAt < scheduledEndAt,
    {
      message: "O término deve ser posterior ao início.",
      path: ["scheduledEndAt"],
    },
  );

export const createMentoringNoteSchema = z.object({
  sessionId: z.string().uuid(),
  visibility: z.enum(["shared", "restricted"]),
  content: z.string().trim().min(3).max(5000),
});

export const createMentoringRecommendationSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(3000),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueOn: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().date().nullable(),
  ),
});

export const updateMentoringRecommendationSchema = z.object({
  recommendationId: z.string().uuid(),
  status: z.enum(["accepted", "dismissed"]),
  ownerUserId: optionalUuid,
});

export const createMentoringFeedbackSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  strengths: z.string().trim().min(3).max(2000),
  improvements: z.string().trim().min(3).max(2000),
  isShared: z.coerce.boolean().default(false),
});

export function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
