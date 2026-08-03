import { describe, expect, it } from "vitest";

import {
  createDiagnosticCampaignSchema,
  createDiagnosticCriterionSchema,
  saveDiagnosticResponseSchema,
} from "@/lib/diagnostics/schemas";

describe("schemas de diagnósticos", () => {
  it("aceita critério numérico sem dependência de CERNE", () => {
    const result = createDiagnosticCriterionSchema.safeParse({
      templateId: "11111111-1111-4111-8111-111111111111",
      dimensionId: "22222222-2222-4222-8222-222222222222",
      prompt: "A startup validou o problema?",
      helpText: "",
      responseType: "numeric",
      weight: "1",
      maximumScore: "5",
      allowsNotApplicable: true,
      options: "",
    });
    expect(result.success).toBe(true);
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
      startsAt: "2026-09-10T09:00",
      endsAt: "2026-08-31T18:00",
      startupIds: [],
      communicationSubject: "",
      communicationMessage: "",
    });
    expect(result.success).toBe(false);
  });
});
