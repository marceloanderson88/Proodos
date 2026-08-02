import { describe, expect, it } from "vitest";

import {
  loginSchema,
  passwordRecoverySchema,
  passwordResetSchema,
} from "@/lib/auth/schemas";

describe("auth schemas", () => {
  it("normaliza e valida credenciais de login", () => {
    expect(
      loginSchema.parse({
        email: "  pessoa@example.com ",
        password: "segredo",
      }),
    ).toEqual({ email: "pessoa@example.com", password: "segredo" });
    expect(
      loginSchema.safeParse({ email: "inválido", password: "" }).success,
    ).toBe(false);
  });

  it("valida e-mail de recuperação", () => {
    expect(
      passwordRecoverySchema.safeParse({ email: "conta@example.com" }).success,
    ).toBe(true);
    expect(passwordRecoverySchema.safeParse({ email: "conta" }).success).toBe(
      false,
    );
  });

  it("exige senha forte mínima e confirmação idêntica", () => {
    expect(
      passwordResetSchema.safeParse({
        password: "novaSenha9",
        passwordConfirmation: "novaSenha9",
      }).success,
    ).toBe(true);
    expect(
      passwordResetSchema.safeParse({
        password: "curta",
        passwordConfirmation: "outra",
      }).success,
    ).toBe(false);
  });
});
