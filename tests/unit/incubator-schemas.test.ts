import { describe, expect, it } from "vitest";

import {
  createIncubatorSchema,
  incubatorLifecycleSchema,
  slugifyIncubatorName,
} from "@/lib/incubators/schemas";

describe("incubator schemas", () => {
  it("normaliza o nome e gera slug sem exigir identificador manual", () => {
    const parsed = createIncubatorSchema.parse({
      organizationId: "10000000-0000-4000-8000-000000000001",
      name: "  Incubadora Sertão Maker  ",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    });
    expect(parsed.name).toBe("Incubadora Sertão Maker");
    expect(slugifyIncubatorName(parsed.name)).toBe("incubadora-sertao-maker");
  });

  it("aceita somente ações de ciclo de vida previstas", () => {
    const id = "20000000-0000-4000-8000-000000000001";
    expect(
      incubatorLifecycleSchema.safeParse({ incubatorId: id, action: "archive" })
        .success,
    ).toBe(true);
    expect(
      incubatorLifecycleSchema.safeParse({ incubatorId: id, action: "purge" })
        .success,
    ).toBe(false);
  });
});
