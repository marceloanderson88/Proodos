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

export const createProgramTypeSchema = z.object({
  incubatorId: z.uuid().nullable(),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
    .max(60),
  name: z.string().trim().min(2).max(120),
  description: optionalText(1000),
});

export const createProgramSchema = z
  .object({
    incubatorId: z.uuid(),
    typeId: z.uuid(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/)
      .max(40),
    name: z.string().trim().min(2).max(160),
    description: optionalText(3000),
    startsOn: optionalDate,
    endsOn: optionalDate,
  })
  .refine(
    ({ startsOn, endsOn }) => !startsOn || !endsOn || startsOn <= endsOn,
    { message: "A data final deve ser posterior à inicial.", path: ["endsOn"] },
  );

export const createCohortSchema = z
  .object({
    programId: z.uuid(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/)
      .max(40),
    name: z.string().trim().min(2).max(160),
    startsOn: optionalDate,
    endsOn: optionalDate,
    capacity: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value)))
      .pipe(z.number().int().min(1).max(100000).nullable()),
  })
  .refine(
    ({ startsOn, endsOn }) => !startsOn || !endsOn || startsOn <= endsOn,
    { message: "A data final deve ser posterior à inicial.", path: ["endsOn"] },
  );

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
