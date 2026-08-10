import { describe, expect, it } from "vitest";

import {
  createMentorAvailabilitySchema,
  createMentorAssignmentSchema,
  createMentorProfileSchema,
  createMentoringFeedbackSchema,
  createMentoringSessionSchema,
  parseCommaSeparatedList,
  rescheduleMentoringSessionSchema,
  updateMentoringRecommendationSchema,
} from "./schemas";

describe("mentoring schemas", () => {
  it("normaliza listas e remove itens repetidos", () => {
    expect(parseCommaSeparatedList("Finanças, SaaS, finanças, ")).toEqual([
      "Finanças",
      "SaaS",
      "finanças",
    ]);

    const result = createMentorProfileSchema.parse({
      userId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      headline: "Mentora de crescimento e produto",
      bio: "Acompanho negócios digitais na validação e na construção de canais.",
      timezone: "America/Sao_Paulo",
      linkedinUrl: "",
      specialties: ["Produto", "produto", "Go-to-market"],
      segments: ["SaaS"],
    });

    expect(result.specialties).toEqual(["Produto", "Go-to-market"]);
    expect(result.linkedinUrl).toBeNull();
  });

  it("impede vínculo com período invertido", () => {
    const result = createMentorAssignmentSchema.safeParse({
      mentorProfileId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      startupId: "fab6f075-1003-46e4-942c-fdc67ea7ad66",
      startsOn: "2026-08-10",
      endsOn: "2026-08-09",
      focus: "Estratégia comercial",
    });

    expect(result.success).toBe(false);
  });

  it("valida horário e vigência da disponibilidade", () => {
    const result = createMentorAvailabilitySchema.safeParse({
      mentorProfileId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      weekday: "2",
      startsAt: "14:00",
      endsAt: "13:00",
      timezone: "America/Sao_Paulo",
      effectiveFrom: "2026-08-10",
      effectiveUntil: "2026-08-30",
    });

    expect(result.success).toBe(false);
  });

  it("exige início e fim juntos ao criar uma sessão", () => {
    const result = createMentoringSessionSchema.safeParse({
      assignmentId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      diagnosticAssessmentId: "",
      objective: "Revisar estratégia de aquisição",
      mode: "remote",
      timezone: "America/Sao_Paulo",
      scheduledStartAt: "2026-08-10T14:00",
      scheduledEndAt: "",
      meetingUrl: "",
      location: "",
    });

    expect(result.success).toBe(false);
  });

  it("impede reagendamento com término anterior ao início", () => {
    const result = rescheduleMentoringSessionSchema.safeParse({
      sessionId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      timezone: "America/Sao_Paulo",
      scheduledStartAt: "2026-08-10T15:00",
      scheduledEndAt: "2026-08-10T14:00",
    });

    expect(result.success).toBe(false);
  });

  it("aceita feedback sem permitir que o cliente escolha sua direção", () => {
    const result = createMentoringFeedbackSchema.parse({
      sessionId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      rating: "5",
      strengths: "Boa preparação e participação ativa.",
      improvements: "Detalhar melhor os próximos experimentos.",
      isShared: true,
    });

    expect(result.rating).toBe(5);
    expect(result).not.toHaveProperty("kind");
  });

  it("não simula conversão de recomendação sem plano de ação", () => {
    const result = updateMentoringRecommendationSchema.safeParse({
      recommendationId: "2d36721b-4015-4ab1-afd0-272c07370f32",
      status: "converted",
      ownerUserId: "",
    });

    expect(result.success).toBe(false);
  });
});
