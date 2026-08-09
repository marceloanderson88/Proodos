import { describe, expect, it } from "vitest";

import { resolveSupabaseAdminKey } from "@/lib/supabase/admin-key";

describe("resolveSupabaseAdminKey", () => {
  it("prioriza a chave de servidor configurada", () => {
    expect(
      resolveSupabaseAdminKey({
        appEnv: "production",
        localAdminKey: undefined,
        secretKey: "server-secret",
        supabaseUrl: "https://project.supabase.co",
      }),
    ).toBe("server-secret");
  });

  it("aceita a chave efêmera somente em testes com Supabase local", () => {
    expect(
      resolveSupabaseAdminKey({
        appEnv: "test",
        localAdminKey: "local-secret",
        secretKey: undefined,
        supabaseUrl: "http://127.0.0.1:54321",
      }),
    ).toBe("local-secret");
  });

  it.each([
    ["production", "http://127.0.0.1:54321"],
    ["test", "https://project.supabase.co"],
    ["test", "not-a-url"],
  ])("rejeita chave local no ambiente %s e URL %s", (appEnv, supabaseUrl) => {
    expect(() =>
      resolveSupabaseAdminKey({
        appEnv,
        localAdminKey: "local-secret",
        secretKey: undefined,
        supabaseUrl,
      }),
    ).toThrow("SUPABASE_SECRET_KEY_NOT_CONFIGURED");
  });
});
