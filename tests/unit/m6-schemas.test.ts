import { describe, expect, it } from "vitest";

import {
  addStartupMemberSchema,
  createCohortSchema,
  createProgramSchema,
  createStartupSchema,
} from "@/lib/m6/schemas";

describe("contratos do Marco 6", () => {
  it("normaliza códigos e campos opcionais de programa", () => {
    const result = createProgramSchema.parse({
      incubatorId: "10000000-0000-4000-8000-000000000001",
      typeId: "10000000-0000-4000-8000-000000000002",
      code: " pre-incubacao-2026 ",
      name: " Pré-incubação 2026 ",
      description: "",
      startsOn: "2026-08-01",
      endsOn: "2026-12-10",
    });

    expect(result.code).toBe("PRE-INCUBACAO-2026");
    expect(result.description).toBeNull();
  });

  it("rejeita período de turma invertido", () => {
    expect(
      createCohortSchema.safeParse({
        programId: "10000000-0000-4000-8000-000000000001",
        code: "T1",
        name: "Turma um",
        startsOn: "2026-12-01",
        endsOn: "2026-08-01",
        capacity: "20",
      }).success,
    ).toBe(false);
  });

  it("não exige vínculo CERNE para cadastrar startup", () => {
    const result = createStartupSchema.safeParse({
      incubatorId: "10000000-0000-4000-8000-000000000001",
      name: "Agro Sertão",
      legalName: "",
      taxId: "",
      sector: "Agtech",
      businessModel: "",
      stage: "validation",
      city: "Salgueiro",
      state: "PE",
      websiteUrl: "",
    });

    expect(result.success).toBe(true);
  });

  it("permite representante sem conta vinculada", () => {
    const result = addStartupMemberSchema.parse({
      startupId: "10000000-0000-4000-8000-000000000001",
      fullName: "Pessoa Empreendedora",
      email: "pessoa@example.com",
      role: "representative",
      roleTitle: "CEO",
      isRepresentative: true,
    });

    expect(result.email).toBe("pessoa@example.com");
  });
});
