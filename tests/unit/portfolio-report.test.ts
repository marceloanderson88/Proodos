import { describe, expect, it } from "vitest";

import { buildPortfolioReport } from "@/lib/reports/portfolio-report";

const programs = [
  { id: "p1", name: "Incubação", status: "active", type_id: "pt1" },
];
const programTypes = [{ id: "pt1", name: "Programa de incubação" }];
const cohorts = [
  {
    id: "c1",
    program_id: "p1",
    name: "Turma 2026.1",
    code: "INC-261",
    status: "active",
    starts_on: "2026-01-01",
    ends_on: null,
    capacity: 2,
  },
  {
    id: "c2",
    program_id: "p1",
    name: "Turma 2026.2",
    code: "INC-262",
    status: "planned",
    starts_on: "2026-07-01",
    ends_on: null,
    capacity: 10,
  },
];
const startups = [
  {
    id: "s1",
    name: "Alpha",
    status: "active",
    stage: "traction",
    city: "São Paulo",
    state: "SP",
    sector: "SaaS",
  },
  {
    id: "s2",
    name: "Beta",
    status: "inactive",
    stage: "validation",
    city: "Salvador",
    state: "BA",
    sector: "Impacto",
  },
  {
    id: "s3",
    name: "Gamma",
    status: "active",
    stage: "idea",
    city: null,
    state: null,
    sector: null,
  },
];
const enrollments = [
  { startup_id: "s1", cohort_id: "c1", status: "active" },
  { startup_id: "s2", cohort_id: "c1", status: "withdrawn" },
  { startup_id: "s3", cohort_id: "c2", status: "active" },
];
const assessments = [
  {
    id: "a-old",
    startup_id: "s1",
    status: "validated",
    self_score: 40,
    validated_score: 40,
    evidence_coverage: 50,
    classification_code: "C1",
    cycle_label: "Inicial",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "a1",
    startup_id: "s1",
    status: "validated",
    self_score: 65,
    validated_score: 70,
    evidence_coverage: 80,
    classification_code: "C2",
    cycle_label: "Final",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "a2",
    startup_id: "s2",
    status: "submitted",
    self_score: 50,
    validated_score: null,
    evidence_coverage: 60,
    classification_code: null,
    cycle_label: "Inicial",
    updated_at: "2026-05-01T00:00:00Z",
  },
];

describe("buildPortfolioReport", () => {
  it("usa somente o diagnóstico mais recente de cada startup", () => {
    const report = buildPortfolioReport({
      programs,
      programTypes,
      cohorts,
      enrollments,
      startups,
      assessments,
      dimensionScores: [],
      dimensions: [],
    });

    expect(report.metrics.total).toBe(3);
    expect(report.metrics.diagnosed).toBe(2);
    expect(report.metrics.diagnosticCoverage).toBe(67);
    expect(report.metrics.averageValidatedScore).toBe(60);
  });

  it("gera o recorte de uma turma sem misturar startups de outra execução", () => {
    const report = buildPortfolioReport({
      programs,
      programTypes,
      cohorts,
      enrollments,
      startups,
      assessments,
      dimensionScores: [
        {
          assessment_id: "a1",
          dimension_id: "d1",
          self_score: 70,
          validated_score: 80,
        },
        {
          assessment_id: "a2",
          dimension_id: "d1",
          self_score: 60,
          validated_score: null,
        },
      ],
      dimensions: [{ id: "d1", code: "MKT", name: "Mercado" }],
      selectedProgramId: "p1",
      selectedCohortId: "c1",
    });

    expect(report.metrics.total).toBe(2);
    expect(report.metrics.active).toBe(1);
    expect(report.startupRows.map((row) => row.name)).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(report.cohortSummaries[0]).toMatchObject({
      startups: 2,
      diagnosed: 2,
      occupancy: 100,
    });
    expect(report.dimensionAverages[0]).toMatchObject({
      code: "MKT",
      score: 70,
      assessments: 2,
    });
    expect(report.startupRows[0]?.programTypes).toEqual([
      "Programa de incubação",
    ]);
  });

  it("combina filtros territoriais, ano, status e tipo de programa", () => {
    const report = buildPortfolioReport({
      programs,
      programTypes,
      cohorts,
      enrollments,
      startups,
      assessments,
      dimensionScores: [],
      dimensions: [],
      selectedProgramTypeId: "pt1",
      selectedYear: "2026",
      selectedState: "SP",
      selectedCity: "São Paulo",
      selectedStatus: "active",
    });

    expect(report.startupRows.map((row) => row.name)).toEqual(["Alpha"]);
  });
});
