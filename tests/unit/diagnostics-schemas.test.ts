import { describe, expect, it } from "vitest";

import {
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
});
