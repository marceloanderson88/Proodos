import { describe, expect, it } from "vitest";

import {
  addStartupMemberSchema,
  createCohortSchema,
  createProgramSchema,
  createProgramTypeSchema,
  createStartupSchema,
  inviteStartupSchema,
  programLifecycleSchema,
  startupSelfRegistrationSchema,
  updateStartupSchema,
  resolveProgramType,
} from "@/lib/m6/schemas";

describe("contratos do Marco 6", () => {
  it("não exige código e normaliza campos opcionais de programa", () => {
    const result = createProgramSchema.parse({
      preset: "pre_incubation",
      customName: "",
      name: " Pré-incubação 2026 ",
      description: "",
      objectives: "",
      targetAudience: "",
      deliveryMode: "hybrid",
      durationWeeks: "",
      suggestedCapacity: "",
      startsOn: "2026-08-01",
      endsOn: "2026-12-10",
      isActive: true,
    });

    expect(result.name).toBe("Pré-incubação 2026");
    expect(result.description).toBeNull();
  });

  it("resolve tipo predefinido e exige nome quando a opção é outro", () => {
    const preset = createProgramTypeSchema.parse({
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
        launchesOn: "2026-07-01",
        enrollmentStartsOn: "",
        enrollmentEndsOn: "",
        startsOn: "2026-12-01",
        endsOn: "2026-08-01",
      }).success,
    ).toBe(false);
  });

  it("exige as duas datas quando houver período de inscrições", () => {
    expect(
      createCohortSchema.safeParse({
        programId: "10000000-0000-4000-8000-000000000001",
        name: "Turma dois",
        launchesOn: "2026-07-01",
        enrollmentStartsOn: "2026-07-10",
        enrollmentEndsOn: "",
        startsOn: "2026-08-01",
        endsOn: "",
      }).success,
    ).toBe(false);
  });

  it("permite programa inativo com fim opcional", () => {
    expect(
      createProgramSchema.safeParse({
        preset: "other",
        customName: "Residência",
        name: "Residência de inovação",
        description: "",
        objectives: "",
        targetAudience: "",
        deliveryMode: "in_person",
        durationWeeks: "12",
        suggestedCapacity: "25",
        startsOn: "2026-09-01",
        endsOn: "",
        isActive: false,
      }).success,
    ).toBe(true);
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

  it("normaliza o autocadastro e não exige turma", () => {
    const result = startupSelfRegistrationSchema.parse({
      applicantName: " Maria Empreendedora ",
      email: "MARIA@EXAMPLE.COM",
      password: "senha-segura",
      name: "Nova Startup",
      legalName: "",
      taxId: "",
      sector: "Educação",
      businessModel: "",
      stage: "idea",
      city: "Salgueiro",
      state: "PE",
      websiteUrl: "",
      cohortId: "",
    });

    expect(result.email).toBe("maria@example.com");
    expect(result.cohortId).toBeNull();
    expect(result.legalName).toBeNull();
  });

  it("aceita convite para startup nova ou existente", () => {
    const result = inviteStartupSchema.parse({
      startupId: "",
      startupName: "Startup Convidada",
      representativeName: "João Silva",
      email: "joao@example.com",
      cohortId: "",
    });

    expect(result.startupId).toBeNull();
    expect(result.cohortId).toBeNull();
  });

  it("permite editar situação e mantém identificador imutável", () => {
    const result = updateStartupSchema.parse({
      startupId: "10000000-0000-4000-8000-000000000001",
      name: "Startup Atualizada",
      legalName: "",
      taxId: "",
      sector: "Tecnologia",
      businessModel: "B2B",
      stage: "traction",
      status: "active",
      city: "Recife",
      state: "PE",
      websiteUrl: "",
    });

    expect(result.startupId).toBe("10000000-0000-4000-8000-000000000001");
    expect(result.status).toBe("active");
  });
});
