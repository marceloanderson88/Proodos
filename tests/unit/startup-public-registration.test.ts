import { describe, expect, it } from "vitest";

import { startupPublicRegistrationContextSchema } from "@/lib/startups/public-registration";

describe("startupPublicRegistrationContextSchema", () => {
  it("aceita somente o contexto público mínimo", () => {
    expect(
      startupPublicRegistrationContextSchema.parse({
        organization: { name: "Proodos" },
        incubator: {
          name: "Sertão Maker",
          shortDescription: null,
        },
        cohorts: [
          {
            id: "92000000-0000-4000-8000-000000000001",
            label: "Pré-incubação · Turma 2026",
          },
        ],
      }),
    ).toMatchObject({ incubator: { name: "Sertão Maker" } });
  });

  it("rejeita turma sem identificador válido", () => {
    expect(() =>
      startupPublicRegistrationContextSchema.parse({
        organization: { name: "Proodos" },
        incubator: { name: "Sertão Maker", shortDescription: null },
        cohorts: [{ id: "invalido", label: "Turma" }],
      }),
    ).toThrow();
  });
});
