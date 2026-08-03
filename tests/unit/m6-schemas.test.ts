import { describe, expect, it } from "vitest";

import {
  addStartupMemberSchema,
  createCohortSchema,
  createProgramSchema,
  createProgramTypeSchema,
  createStartupSchema,
  programLifecycleSchema,
  resolveProgramType,
} from "@/lib/m6/schemas";

describe("contratos do Marco 6", () => {
  it("não exige código e normaliza campos opcionais de programa", () => {
    const result = createProgramSchema.parse({
      incubatorId: "10000000-0000-4000-8000-000000000001",
      typeId: "10000000-0000-4000-8000-000000000002",
      name: " Pré-incubação 2026 ",
      description: "",
      startsOn: "2026-08-01",
      endsOn: "2026-12-10",
    });

    expect(result.name).toBe("Pré-incubação 2026");
    expect(result.description).toBeNull();
  });

  it("resolve tipo predefinido e exige nome quando a opção é outro", () => {
    const preset = createProgramTypeSchema.parse({
      incubatorId: null,
      preset: "pre_incubation",
      customName: "",
      description: "",
    });

    expect(resolveProgramType(preset)).toEqual({
      code: "pre_incubacao",
      name: "Pré-Incubação",
    });
    expect(
      createProgramTypeSchema.safeParse({
        incubatorId: null,
        preset: "other",
        customName: "",
        description: "",
      }).success,
    ).toBe(false);
  });

  it("rejeita período de turma invertido", () => {
    expect(
      createCohortSchema.safeParse({
        programId: "10000000-0000-4000-8000-000000000001",
        name: "Turma um",
        startsOn: "2026-12-01",
        endsOn: "2026-08-01",
        capacity: "20",
      }).success,
    ).toBe(false);
  });

  it("aceita somente excluir ou arquivar no ciclo de vida", () => {
    expect(
      programLifecycleSchema.safeParse({
        programId: "10000000-0000-4000-8000-000000000001",
        action: "archive",
      }).success,
    ).toBe(true);
    expect(
      programLifecycleSchema.safeParse({
        programId: "10000000-0000-4000-8000-000000000001",
        action: "purge",
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
