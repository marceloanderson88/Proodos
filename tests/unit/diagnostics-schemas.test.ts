import { describe, expect, it } from "vitest";

import {
  addDiagnosticExternalEvidenceSchema,
  addDiagnosticAssessmentNoteSchema,
  assignDiagnosticRespondentSchema,
  autosaveDiagnosticResponseSchema,
  createDiagnosticCampaignSchema,
  createDiagnosticCriterionSchema,
  createDiagnosticDimensionSchema,
  diagnosticAssessmentTransitionSchema,
  duplicateDiagnosticTemplateSchema,
  inviteDiagnosticRespondentSchema,
  saveDiagnosticResponseSchema,
  saveDiagnosticIndicatorValueSchema,
  updateDiagnosticDimensionSchema,
} from "@/lib/diagnostics/schemas";

describe("schemas de diagnósticos", () => {
  it("aceita critério de maturidade completo sem dependência de CERNE", () => {
    const result = createDiagnosticCriterionSchema.safeParse({
      templateId: "11111111-1111-4111-8111-111111111111",
      dimensionId: "22222222-2222-4222-8222-222222222222",
      code: "EM1",
      prompt: "A startup validou o problema?",
      helpText: "",
      weight: "1",
      allowsNotApplicable: true,
      requiresNotApplicableJustification: true,
      evidenceRequiredFrom: "3",
      rubric0: "Não existe evidência de validação.",
      rubric1: "A hipótese foi registrada.",
      rubric2: "A hipótese está em teste.",
      rubric3: "A hipótese foi validada com evidências.",
      rubric4: "A validação é revisada continuamente.",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita dimensão e critério sem códigos técnicos válidos", () => {
    expect(
      createDiagnosticDimensionSchema.safeParse({
        templateId: "11111111-1111-4111-8111-111111111111",
        code: "dimensão 1",
        name: "Estratégia",
        description: "",
        weight: 50,
        isEssential: true,
      }).success,
    ).toBe(false);
  });

  it("aceita criação de nova versão e transição de avaliação", () => {
    expect(
      duplicateDiagnosticTemplateSchema.safeParse({
        templateId: "11111111-1111-4111-8111-111111111111",
        versionLabel: "2.0",
        changelog: "Revisão anual dos critérios.",
      }).success,
    ).toBe(true);
    expect(
      diagnosticAssessmentTransitionSchema.safeParse({
        assessmentId: "22222222-2222-4222-8222-222222222222",
        returnTo: "/o/proodos/i/sertao-maker/diagnosticos/avaliacoes/1",
      }).success,
    ).toBe(true);
  });

  it("exige justificativa quando a resposta não se aplica", () => {
    const result = saveDiagnosticResponseSchema.safeParse({
      assessmentId: "11111111-1111-4111-8111-111111111111",
      criterionId: "22222222-2222-4222-8222-222222222222",
      responseType: "numeric",
      value: "",
      comment: "",
      evidenceNotes: "",
      isNotApplicable: true,
      notApplicableJustification: "",
    });
    expect(result.success).toBe(false);
  });

  it("aceita campanha com período válido e ao menos uma startup", () => {
    const result = createDiagnosticCampaignSchema.safeParse({
      name: "Diagnóstico de Maturidade · 2026/2",
      templateId: "11111111-1111-4111-8111-111111111111",
      programId: "",
      cohortId: "",
      evaluatorId: "",
      executionMode: "self_assessment",
      startsAt: "2026-08-10T09:00",
      endsAt: "2026-08-31T18:00",
      startupIds: ["22222222-2222-4222-8222-222222222222"],
      communicationSubject: "Convite",
      communicationMessage: "Responda até o encerramento.",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita campanha sem startup e com período invertido", () => {
    const result = createDiagnosticCampaignSchema.safeParse({
      name: "Campanha inválida",
      templateId: "11111111-1111-4111-8111-111111111111",
      programId: "",
      cohortId: "",
      evaluatorId: "",
      executionMode: "self_assessment",
      startsAt: "2026-09-10T09:00",
      endsAt: "2026-08-31T18:00",
      startupIds: [],
      communicationSubject: "",
      communicationMessage: "",
    });
    expect(result.success).toBe(false);
  });

  it("exige responsável no diagnóstico assistido e aceita observação", () => {
    const campaign = createDiagnosticCampaignSchema.safeParse({
      name: "Avaliação assistida · 2026/2",
      templateId: "11111111-1111-4111-8111-111111111111",
      programId: "",
      cohortId: "",
      evaluatorId: "",
      executionMode: "facilitated",
      startsAt: "2026-08-10T09:00",
      endsAt: "2026-08-31T18:00",
      startupIds: ["22222222-2222-4222-8222-222222222222"],
      communicationSubject: "",
      communicationMessage: "",
    });
    expect(campaign.success).toBe(false);
    expect(
      addDiagnosticAssessmentNoteSchema.safeParse({
        assessmentId: "22222222-2222-4222-8222-222222222222",
        body: "A equipe apresentou evidências adicionais durante a entrevista.",
        returnTo: "/o/proodos/i/sertao-maker/diagnosticos/avaliacoes/1",
      }).success,
    ).toBe(true);
  });

  it("valida edição de dimensão e vínculo de responsável", () => {
    expect(
      updateDiagnosticDimensionSchema.safeParse({
        templateId: "11111111-1111-4111-8111-111111111111",
        dimensionId: "22222222-2222-4222-8222-222222222222",
        code: "D1",
        name: "Estratégia e mercado",
        description: "Leitura revisada.",
        weight: "25",
        isEssential: true,
      }).success,
    ).toBe(true);
    expect(
      assignDiagnosticRespondentSchema.safeParse({
        assessmentId: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
        role: "primary",
        returnTo: "/o/proodos/i/sertao-maker/diagnosticos/avaliacoes/1",
      }).success,
    ).toBe(true);
  });

  it("aceita somente URL HTTPS como evidência externa", () => {
    const base = {
      responseId: "11111111-1111-4111-8111-111111111111",
      label: "Canvas validado",
      returnTo: "/o/proodos/i/sertao-maker/diagnosticos/avaliacoes/1",
    };
    expect(
      addDiagnosticExternalEvidenceSchema.safeParse({
        ...base,
        externalUrl: "https://drive.google.com/document/d/arquivo",
      }).success,
    ).toBe(true);
    expect(
      addDiagnosticExternalEvidenceSchema.safeParse({
        ...base,
        externalUrl: "http://exemplo.inseguro/arquivo",
      }).success,
    ).toBe(false);
  });

  it("exige versão de concorrência válida no autosave", () => {
    const payload = {
      assessmentId: "11111111-1111-4111-8111-111111111111",
      criterionId: "22222222-2222-4222-8222-222222222222",
      responseType: "numeric",
      value: "3",
      comment: "Evidência revisada.",
      evidenceNotes: "Ata da reunião.",
      isNotApplicable: false,
      notApplicableJustification: "",
    };
    expect(
      autosaveDiagnosticResponseSchema.safeParse({
        ...payload,
        lockVersion: "7",
      }).success,
    ).toBe(true);
    expect(
      autosaveDiagnosticResponseSchema.safeParse({
        ...payload,
        lockVersion: "-1",
      }).success,
    ).toBe(false);
  });

  it("valida indicadores manuais e exige justificativa para N/A", () => {
    const base = {
      assessmentId: "11111111-1111-4111-8111-111111111111",
      indicatorDefinitionId: "22222222-2222-4222-8222-222222222222",
      lockVersion: "3",
      targetValue: "10000",
      evidenceNotes: "Relatório financeiro de julho.",
    };
    expect(
      saveDiagnosticIndicatorValueSchema.safeParse({
        ...base,
        numericValue: "8500,50",
        isNotApplicable: false,
        notApplicableJustification: "",
      }).success,
    ).toBe(true);
    expect(
      saveDiagnosticIndicatorValueSchema.safeParse({
        ...base,
        numericValue: "",
        isNotApplicable: true,
        notApplicableJustification: "",
      }).success,
    ).toBe(false);
  });

  it("valida convite contextual com papel organizacional e da resposta", () => {
    expect(
      inviteDiagnosticRespondentSchema.safeParse({
        assessmentId: "11111111-1111-4111-8111-111111111111",
        invitedName: "Fundadora da startup",
        email: "fundadora@example.com",
        roleId: "22222222-2222-4222-8222-222222222222",
        respondentRole: "primary",
        returnTo: "/o/proodos/i/sertao-maker/diagnosticos/avaliacoes/1",
      }).success,
    ).toBe(true);
    expect(
      inviteDiagnosticRespondentSchema.safeParse({
        assessmentId: "11111111-1111-4111-8111-111111111111",
        invitedName: "A",
        email: "email-invalido",
        roleId: "22222222-2222-4222-8222-222222222222",
        respondentRole: "owner",
        returnTo: "/",
      }).success,
    ).toBe(false);
  });
});
