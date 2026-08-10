import { describe, expect, it } from "vitest";

import { calculateCerneCoverage } from "@/lib/cerne/metrics";
import {
  createCerneCycleSchema,
  registerCerneEvidenceSchema,
} from "@/lib/cerne/schemas";
import type { CerneSlot } from "@/lib/cerne/types";

describe("CERNE", () => {
  it("rejeita ciclos com datas invertidas", () => {
    expect(
      createCerneCycleSchema.safeParse({
        name: "Ciclo 2026",
        referenceYear: 2026,
        targetLevel: 2,
        startsOn: "2026-12-01",
        endsOn: "2026-01-01",
      }).success,
    ).toBe(false);
  });

  it("aceita evidência originada por uma startup sem exigir link duplicado", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(
      registerCerneEvidenceSchema.safeParse({
        cycleId: id,
        practiceCode: "1.3.1",
        requirementId: id,
        title: "Diagnóstico validado",
        description: "",
        externalUrl: "",
        sourceModule: "startup",
        sourceEntityType: "startup",
        sourceEntityId: "",
        scopeType: "startup",
        scopeEntityId: id,
      }).success,
    ).toBe(true);
  });

  it("considera dispensas na cobertura validada", () => {
    const base = {
      id: "1",
      cycle_id: "c",
      practice_code: "1.1.1",
      requirement_id: "r",
      scope_type: "incubator",
      title: "Item",
      due_at: null,
      responsible_user_id: null,
    } as const;
    const slots = [
      { ...base, status: "approved" },
      { ...base, id: "2", status: "waived" },
      { ...base, id: "3", status: "pending" },
    ] as CerneSlot[];
    expect(calculateCerneCoverage(slots)).toMatchObject({
      total: 3,
      approved: 2,
      approvedPercent: 67,
    });
  });
});
