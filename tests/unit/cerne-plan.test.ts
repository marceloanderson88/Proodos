import { describe, expect, it } from "vitest";

import { calculateCerneCoverage } from "@/lib/cerne/metrics";
import { saveCerneActionDecisionSchema } from "@/lib/cerne/schemas";
import type { CerneSlot } from "@/lib/cerne/types";

function slot(
  id: string,
  status: CerneSlot["status"],
  required = true,
): CerneSlot {
  return {
    id,
    cycle_id: "cycle",
    practice_code: "1.1.1",
    requirement_id: "requirement",
    scope_type: "incubator",
    title: "Evidência",
    due_at: null,
    responsible_user_id: null,
    required,
    adjustment_notes: null,
    adjusted_at: null,
    status,
  };
}

describe("plano de evidências CERNE", () => {
  it("retira itens opcionais do denominador de prontidão", () => {
    const coverage = calculateCerneCoverage([
      slot("1", "approved"),
      slot("2", "pending"),
      slot("3", "pending", false),
    ]);

    expect(coverage.total).toBe(2);
    expect(coverage.optional).toBe(1);
    expect(coverage.approvedPercent).toBe(50);
  });

  it("aceita uma adaptação justificada por ciclo", () => {
    const result = saveCerneActionDecisionSchema.safeParse({
      cycleId: "11111111-1111-4111-8111-111111111111",
      actionId: "22222222-2222-4222-8222-222222222222",
      status: "adjusted",
      decision: "Consolidar em dossiê anual",
      notes: "Evita duplicidade de atas e relatórios.",
      minimumEvidence: "Plano anual + relatório de efetividade",
      periodicity: "Por ciclo",
    });

    expect(result.success).toBe(true);
  });
});
