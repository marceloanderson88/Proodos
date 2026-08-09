import { z } from "zod";

export const startupPublicRegistrationContextSchema = z.object({
  organization: z.object({
    name: z.string().trim().min(1),
  }),
  incubator: z.object({
    name: z.string().trim().min(1),
    shortDescription: z.string().nullable(),
  }),
  cohorts: z.array(
    z.object({
      id: z.uuid(),
      label: z.string().trim().min(1),
    }),
  ),
});

export type StartupPublicRegistrationContext = z.infer<
  typeof startupPublicRegistrationContextSchema
>;
