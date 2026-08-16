import { describe, expect, it } from "vitest";

import {
  createSelectionCallSchema,
  defaultSelectionCriteria,
  defaultSelectionQuestions,
  publicSelectionAppealSchema,
  publicSelectionApplicationSchema,
  publicSelectionConvocationSchema,
} from "@/lib/selection/schemas";

const validCall = {
  cohortId: "92000000-0000-4000-8000-000000000001",
  code: "EDITAL-2026-01",
  slug: "incubacao-2026-1",
  title: "Seleção para incubação 2026.1",
  summary: "Chamada pública",
  applicationsOpenAt: "2026-08-10T09:00",
  applicationsCloseAt: "2026-09-10T18:00",
  evaluationsOpenAt: "",
  evaluationsCloseAt: "",
  appealsOpenAt: "",
  appealsCloseAt: "",
  totalVacancies: "10",
  waitlistSize: "5",
  reviewersPerApplication: "2",
  divergenceThreshold: "30",
  quotaField: "",
  quotaValues: "",
  quotaPercentage: "",
  questions: defaultSelectionQuestions(),
  criteria: defaultSelectionCriteria(),
};

describe("selection call schemas", () => {
  it("normaliza uma chamada completa com formulário e rubrica", () => {
    const parsed = createSelectionCallSchema.parse(validCall);
    expect(parsed.totalVacancies).toBe(10);
    expect(parsed.criteria).toHaveLength(4);
    expect(
      parsed.questions.some((question) => question.code === "pitch_url"),
    ).toBe(true);
  });

  it("rejeita cronograma invertido e rubrica vazia", () => {
    expect(() =>
      createSelectionCallSchema.parse({
        ...validCall,
        applicationsCloseAt: "2026-08-09T18:00",
        criteria: [],
      }),
    ).toThrow();
  });

  it("rejeita etapas posteriores fora da ordem do edital", () => {
    expect(() =>
      createSelectionCallSchema.parse({
        ...validCall,
        evaluationsOpenAt: "2026-09-09T09:00",
        evaluationsCloseAt: "2026-09-20T18:00",
      }),
    ).toThrow(/ordem cronológica/);

    expect(() =>
      createSelectionCallSchema.parse({
        ...validCall,
        appealsOpenAt: "2026-09-21T09:00",
      }),
    ).toThrow(/ordem cronológica/);
  });

  it("valida os dados públicos sem aceitar estágio arbitrário", () => {
    expect(() =>
      publicSelectionApplicationSchema.parse({
        applicantName: "Maria Silva",
        applicantEmail: "MARIA@EXAMPLE.COM",
        applicantPhone: "",
        startupName: "Nova Caatinga",
        legalName: "",
        taxId: "",
        city: "Petrolina",
        state: "PE",
        sector: "Agtech",
        stage: "desconhecido",
        summary: "",
        answers: { problem: "Escassez hídrica" },
      }),
    ).toThrow();
  });

  it("normaliza a identidade usada no recurso público", () => {
    const parsed = publicSelectionAppealSchema.parse({
      protocol: " abc-20260810-123456 ",
      email: "MARIA@EXAMPLE.COM",
      grounds:
        "Solicito revisão porque o documento foi enviado no prazo correto.",
    });
    expect(parsed.protocol).toBe("ABC-20260810-123456");
    expect(parsed.email).toBe("maria@example.com");
  });

  it("rejeita respostas arbitrárias na convocação pública", () => {
    expect(() =>
      publicSelectionConvocationSchema.parse({
        protocol: "ABC-20260810-123456",
        email: "maria@example.com",
        response: "maybe",
      }),
    ).toThrow();
  });
});
