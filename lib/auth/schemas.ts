import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const passwordRecoverySchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(72, "A senha deve ter no máximo 72 caracteres."),
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "As senhas precisam ser iguais.",
    path: ["passwordConfirmation"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordRecoveryInput = z.infer<typeof passwordRecoverySchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
