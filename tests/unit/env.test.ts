import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/lib/env";

describe("parsePublicEnv", () => {
  it("aplica defaults seguros no Marco 1", () => {
    expect(parsePublicEnv({})).toEqual({
      NEXT_PUBLIC_APP_NAME: "Plataforma Sertão Maker",
      NEXT_PUBLIC_APP_ENV: "development",
    });
  });

  it("rejeita ambiente público desconhecido", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_ENV: "prod" })).toThrow();
  });
});
