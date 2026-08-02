import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_DESTINATION,
  getSafeAuthDestination,
  getSafeCallbackDestination,
} from "@/lib/auth/safe-redirect";

describe("getSafeAuthDestination", () => {
  it("aceita somente rotas privadas da aplicação", () => {
    expect(getSafeAuthDestination("/o/sertao-maker/startups?aba=ativas")).toBe(
      "/o/sertao-maker/startups?aba=ativas",
    );
  });

  it("aceita apenas a tela interna de redefinição no callback de recuperação", () => {
    expect(getSafeCallbackDestination("/redefinir-senha")).toBe(
      "/redefinir-senha",
    );
    expect(getSafeCallbackDestination("/recuperar-senha")).toBe(
      DEFAULT_AUTH_DESTINATION,
    );
  });

  it.each([
    "https://evil.example/o/tenant",
    "//evil.example/o/tenant",
    "/login",
    "javascript:alert(1)",
    undefined,
  ])("rejeita destino inseguro %s", (value) => {
    expect(getSafeAuthDestination(value)).toBe(DEFAULT_AUTH_DESTINATION);
  });
});
