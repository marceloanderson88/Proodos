import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Data inválida.",
  })
  .transform((value) => value || null);

export const organizationSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

export const createIncubatorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
});

export const programTypePresetSchema = z.enum([
  "pre_incubation",
  "incubation",
  "acceleration",
  "other",
]);

export const createProgramTypeSchema = z
  .object({
    incubatorId: z.uuid(),
    preset: programTypePresetSchema,
    customName: optionalText(120),
    description: optionalText(1000),
  })
  .refine(({ preset, customName }) => preset !== "other" || customName, {
    message: "Informe o nome do tipo de programa.",
    path: ["customName"],
  });

const programTypeNames = {
  pre_incubation: "Pré-Incubação",
  incubation: "Incubação",
  acceleration: "Aceleração",
} as const;

export function resolveProgramType(
  input: z.infer<typeof createProgramTypeSchema>,
) {
  const name =
    input.preset === "other"
      ? (input.customName ?? "")
      : programTypeNames[input.preset];
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

  return { code, name };
}

export const createProgramSchema = z
  .object({
    incubatorId: z.uuid(),
    preset: programTypePresetSchema,
    customName: optionalText(120),
    name: z.string().trim().min(2).max(160),
    description: optionalText(3000),
    startsOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: optionalDate,
    isActive: z.boolean(),
  })
  .refine(({ preset, customName }) => preset !== "other" || customName, {
    message: "Informe o outro tipo de programa.",
    path: ["customName"],
  })
  .refine(
    ({ startsOn, endsOn }) => !startsOn || !endsOn || startsOn <= endsOn,
    { message: "A data final deve ser posterior à inicial.", path: ["endsOn"] },
  );

export const createCohortSchema = z
  .object({
    programId: z.uuid(),
    name: z.string().trim().min(2).max(160),
    launchesOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    enrollmentStartsOn: optionalDate,
    enrollmentEndsOn: optionalDate,
    startsOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: optionalDate,
  })
  .refine(
    ({ enrollmentStartsOn, enrollmentEndsOn }) =>
      Boolean(enrollmentStartsOn) === Boolean(enrollmentEndsOn),
    {
      message: "Informe o início e o fim das inscrições.",
      path: ["enrollmentEndsOn"],
    },
  )
  .refine(
    ({ enrollmentStartsOn, enrollmentEndsOn }) =>
      !enrollmentStartsOn ||
      !enrollmentEndsOn ||
      enrollmentStartsOn <= enrollmentEndsOn,
    {
      message: "O fim das inscrições deve ser posterior ao início.",
      path: ["enrollmentEndsOn"],
    },
  )
  .refine(
    ({ startsOn, endsOn }) => !startsOn || !endsOn || startsOn <= endsOn,
    { message: "A data final deve ser posterior à inicial.", path: ["endsOn"] },
  );

export const updateProgramSchema = createProgramSchema.safeExtend({
  programId: z.uuid(),
  removeLogo: z.boolean(),
});

export const manageIncubatorPersonRoleSchema = z.object({
  membershipId: z.uuid(),
  roleId: z.uuid(),
});

export const removeIncubatorPersonRoleSchema = z.object({
  assignmentId: z.uuid(),
});

export const programLifecycleSchema = z.object({
  programId: z.uuid(),
  action: z.enum(["delete", "archive"]),
});

export const createStartupSchema = z.object({
  incubatorId: z.uuid(),
  name: z.string().trim().min(2).max(160),
  legalName: optionalText(200),
  taxId: optionalText(32),
  sector: optionalText(120),
  businessModel: optionalText(2000),
  stage: z.enum(["idea", "validation", "operation", "traction", "scale"]),
  city: optionalText(120),
  state: optionalText(120),
  websiteUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.url().safeParse(value).success,
      "URL inválida.",
    )
    .transform((value) => value || null),
});

export const addStartupMemberSchema = z.object({
  startupId: z.uuid(),
  fullName: z.string().trim().min(2).max(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "E-mail inválido.",
    )
    .transform((value) => value || null),
  role: z.enum([
    "founder",
    "cofounder",
    "representative",
    "employee",
    "advisor",
    "other",
  ]),
  roleTitle: optionalText(120),
  isRepresentative: z.boolean(),
});

export const enrollStartupSchema = z.object({
  startupId: z.uuid(),
  cohortId: z.uuid(),
  entryDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type CreateStartupInput = z.infer<typeof createStartupSchema>;
