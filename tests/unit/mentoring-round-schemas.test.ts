import { describe, expect, it } from "vitest";

import {
  bookMentoringRoundSessionSchema,
  createMentoringRoundSchema,
} from "@/lib/mentoring/schemas";

describe("rodadas de mentoria", () => {
  it("aceita uma rodada com janelas coerentes", () => {
    const result = createMentoringRoundSchema.safeParse({
      cohortId: "11111111-1111-4111-8111-111111111111",
      name: "Rodada comercial",
      description: "Atendimentos de validação comercial",
      bookingOpensAt: "2026-09-01T08:00",
      bookingClosesAt: "2026-09-05T18:00",
      sessionsStartAt: "2026-09-08T08:00",
      sessionsEndAt: "2026-09-12T18:00",
      timezone: "America/Sao_Paulo",
      maxSessions: "2",
      openNow: "false",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita reserva com encerramento anterior à abertura", () => {
    const result = createMentoringRoundSchema.safeParse({
      cohortId: "11111111-1111-4111-8111-111111111111",
      name: "Rodada comercial",
      description: "",
      bookingOpensAt: "2026-09-05T18:00",
      bookingClosesAt: "2026-09-01T08:00",
      sessionsStartAt: "2026-09-08T08:00",
      sessionsEndAt: "2026-09-12T18:00",
      timezone: "America/Sao_Paulo",
      maxSessions: "1",
      openNow: "false",
    });

    expect(result.success).toBe(false);
  });

  it("valida o intervalo da sessão solicitada", () => {
    const result = bookMentoringRoundSessionSchema.safeParse({
      roundId: "11111111-1111-4111-8111-111111111111",
      assignmentId: "22222222-2222-4222-8222-222222222222",
      objective: "Revisar estratégia de aquisição",
      mode: "remote",
      timezone: "America/Sao_Paulo",
      scheduledStartAt: "2026-09-09T14:00",
      scheduledEndAt: "2026-09-09T15:00",
      meetingUrl: "https://meet.example.com/mentoria",
      location: "",
    });

    expect(result.success).toBe(true);
  });
});
