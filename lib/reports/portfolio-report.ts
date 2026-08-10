export type ReportProgram = {
  id: string;
  name: string;
  status: string;
  type_id: string;
};

export type ReportProgramType = {
  id: string;
  name: string;
};

export type ReportCohort = {
  id: string;
  program_id: string;
  name: string;
  code: string;
  status: string;
  starts_on: string;
  ends_on: string | null;
  capacity: number | null;
};

export type ReportEnrollment = {
  startup_id: string;
  cohort_id: string;
  status: string;
};

export type ReportStartup = {
  id: string;
  name: string;
  status: string;
  stage: string;
  city: string | null;
  state: string | null;
  sector: string | null;
};

export type ReportAssessment = {
  id: string;
  startup_id: string;
  status: string;
  self_score: number | null;
  validated_score: number | null;
  evidence_coverage: number | null;
  classification_code: string | null;
  cycle_label: string;
  updated_at: string;
};

export type ReportDimensionScore = {
  assessment_id: string;
  dimension_id: string;
  self_score: number | null;
  validated_score: number | null;
};

export type ReportDimension = {
  id: string;
  code: string | null;
  name: string;
};

export type DistributionPoint = {
  key: string;
  label: string;
  value: number;
  percentage: number;
};

export type PortfolioReport = {
  metrics: {
    total: number;
    active: number;
    inactive: number;
    diagnosed: number;
    diagnosticCoverage: number;
    averageValidatedScore: number | null;
    averageEvidenceCoverage: number | null;
  };
  statusDistribution: DistributionPoint[];
  stageDistribution: DistributionPoint[];
  regionDistribution: DistributionPoint[];
  sectorDistribution: DistributionPoint[];
  classificationDistribution: DistributionPoint[];
  dimensionAverages: Array<{
    id: string;
    code: string | null;
    name: string;
    score: number;
    assessments: number;
  }>;
  cohortSummaries: Array<{
    id: string;
    name: string;
    code: string;
    programName: string;
    status: string;
    capacity: number | null;
    startups: number;
    active: number;
    diagnosed: number;
    averageScore: number | null;
    occupancy: number | null;
  }>;
  startupRows: Array<{
    id: string;
    name: string;
    status: string;
    stage: string;
    region: string;
    sector: string;
    cohorts: string;
    programTypes: string[];
    programNames: string[];
    diagnosticStatus: string;
    diagnosticScore: number | null;
    evidenceCoverage: number | null;
  }>;
};

const statusLabels: Record<string, string> = {
  active: "Ativas",
  inactive: "Inativas",
  graduated: "Graduadas",
  withdrawn: "Desistentes",
  archived: "Arquivadas",
};

const stageLabels: Record<string, string> = {
  idea: "Ideia",
  validation: "Validação",
  operation: "Operação",
  traction: "Tração",
  scale: "Escala",
  graduated: "Graduada",
};

function average(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number => typeof value === "number",
  );
  if (!valid.length) return null;
  return (
    Math.round(
      (valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10,
    ) / 10
  );
}

function distribution(
  values: string[],
  labels: Record<string, string> = {},
): DistributionPoint[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const total = values.length || 1;
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort(
      (a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"),
    );
}

export function buildPortfolioReport({
  programs,
  programTypes,
  cohorts,
  enrollments,
  startups,
  assessments,
  dimensionScores,
  dimensions,
  selectedProgramId,
  selectedCohortId,
  selectedProgramTypeId,
  selectedYear,
  selectedState,
  selectedCity,
  selectedStatus,
}: {
  programs: ReportProgram[];
  programTypes: ReportProgramType[];
  cohorts: ReportCohort[];
  enrollments: ReportEnrollment[];
  startups: ReportStartup[];
  assessments: ReportAssessment[];
  dimensionScores: ReportDimensionScore[];
  dimensions: ReportDimension[];
  selectedProgramId?: string;
  selectedCohortId?: string;
  selectedProgramTypeId?: string;
  selectedYear?: string;
  selectedState?: string;
  selectedCity?: string;
  selectedStatus?: string;
}): PortfolioReport {
  const scopedPrograms = programs.filter((program) => {
    if (selectedProgramTypeId && program.type_id !== selectedProgramTypeId)
      return false;
    if (selectedProgramId && program.id !== selectedProgramId) return false;
    return true;
  });
  const programIds = new Set(scopedPrograms.map((program) => program.id));
  const scopedCohorts = cohorts.filter((cohort) => {
    if (!programIds.has(cohort.program_id)) return false;
    if (selectedYear && cohort.starts_on.slice(0, 4) !== selectedYear)
      return false;
    if (selectedCohortId) return cohort.id === selectedCohortId;
    return true;
  });
  const scopedCohortIds = new Set(scopedCohorts.map((cohort) => cohort.id));
  const scopedEnrollments = enrollments.filter((item) =>
    scopedCohortIds.has(item.cohort_id),
  );
  const enrolledStartupIds = new Set(
    scopedEnrollments.map((item) => item.startup_id),
  );
  const isProgramFiltered = Boolean(
    selectedProgramTypeId ||
    selectedProgramId ||
    selectedCohortId ||
    selectedYear,
  );
  const scopedStartups = startups.filter((startup) => {
    if (isProgramFiltered && !enrolledStartupIds.has(startup.id)) return false;
    if (selectedState && startup.state !== selectedState) return false;
    if (selectedCity && startup.city !== selectedCity) return false;
    if (selectedStatus && startup.status !== selectedStatus) return false;
    return true;
  });
  const startupIds = new Set(scopedStartups.map((startup) => startup.id));

  const latestAssessmentByStartup = new Map<string, ReportAssessment>();
  assessments
    .filter(
      (assessment) =>
        startupIds.has(assessment.startup_id) &&
        assessment.status !== "cancelled",
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .forEach((assessment) => {
      if (!latestAssessmentByStartup.has(assessment.startup_id))
        latestAssessmentByStartup.set(assessment.startup_id, assessment);
    });

  const latestAssessments = [...latestAssessmentByStartup.values()];
  const latestAssessmentIds = new Set(latestAssessments.map((item) => item.id));
  const dimensionsById = new Map(dimensions.map((item) => [item.id, item]));
  const dimensionBuckets = new Map<string, number[]>();
  dimensionScores
    .filter((score) => latestAssessmentIds.has(score.assessment_id))
    .forEach((score) => {
      const value = score.validated_score ?? score.self_score;
      if (value == null) return;
      const values = dimensionBuckets.get(score.dimension_id) ?? [];
      values.push(value);
      dimensionBuckets.set(score.dimension_id, values);
    });

  const dimensionAverages = [...dimensionBuckets.entries()]
    .map(([id, values]) => {
      const dimension = dimensionsById.get(id);
      return {
        id,
        code: dimension?.code ?? null,
        name: dimension?.name ?? "Dimensão",
        score: average(values) ?? 0,
        assessments: values.length,
      };
    })
    .sort((a, b) => b.score - a.score);

  const programNames = new Map(
    programs.map((program) => [program.id, program.name]),
  );
  const programTypeNames = new Map(
    programTypes.map((programType) => [programType.id, programType.name]),
  );
  const programTypesByProgramId = new Map(
    programs.map((program) => [
      program.id,
      programTypeNames.get(program.type_id) ?? "Tipo não informado",
    ]),
  );
  const cohortNames = new Map(
    scopedCohorts.map((cohort) => [cohort.id, cohort.name]),
  );
  const startupsById = new Map(
    scopedStartups.map((startup) => [startup.id, startup]),
  );

  const cohortSummaries = scopedCohorts.map((cohort) => {
    const cohortStartupIds = new Set(
      scopedEnrollments
        .filter((item) => item.cohort_id === cohort.id)
        .map((item) => item.startup_id),
    );
    const cohortStartups = [...cohortStartupIds]
      .map((id) => startupsById.get(id))
      .filter((item): item is ReportStartup => Boolean(item));
    const cohortAssessments = cohortStartups
      .map((startup) => latestAssessmentByStartup.get(startup.id))
      .filter((item): item is ReportAssessment => Boolean(item));
    return {
      id: cohort.id,
      name: cohort.name,
      code: cohort.code,
      programName: programNames.get(cohort.program_id) ?? "Programa",
      status: cohort.status,
      capacity: cohort.capacity,
      startups: cohortStartups.length,
      active: cohortStartups.filter((startup) => startup.status === "active")
        .length,
      diagnosed: cohortAssessments.length,
      averageScore: average(
        cohortAssessments.map(
          (item) => item.validated_score ?? item.self_score,
        ),
      ),
      occupancy:
        cohort.capacity && cohort.capacity > 0
          ? Math.round((cohortStartups.length / cohort.capacity) * 100)
          : null,
    };
  });

  const startupRows = scopedStartups
    .map((startup) => {
      const assessment = latestAssessmentByStartup.get(startup.id);
      const startupCohorts = scopedEnrollments
        .filter((item) => item.startup_id === startup.id)
        .map((item) => cohortNames.get(item.cohort_id))
        .filter((name): name is string => Boolean(name));
      const startupProgramIds = new Set(
        scopedEnrollments
          .filter((item) => item.startup_id === startup.id)
          .map(
            (item) =>
              scopedCohorts.find((cohort) => cohort.id === item.cohort_id)
                ?.program_id,
          )
          .filter((id): id is string => Boolean(id)),
      );
      const startupProgramNames = [...startupProgramIds]
        .map((id) => programNames.get(id))
        .filter((name): name is string => Boolean(name));
      const startupProgramTypes = [
        ...new Set(
          [...startupProgramIds].map(
            (id) => programTypesByProgramId.get(id) ?? "Tipo não informado",
          ),
        ),
      ];
      return {
        id: startup.id,
        name: startup.name,
        status: statusLabels[startup.status] ?? startup.status,
        stage: stageLabels[startup.stage] ?? startup.stage,
        region:
          [startup.city, startup.state].filter(Boolean).join(" / ") ||
          "Não informada",
        sector: startup.sector ?? "Não informado",
        cohorts: startupCohorts.join(" · ") || "Sem turma",
        programTypes:
          startupProgramTypes.length > 0
            ? startupProgramTypes
            : ["Sem programa"],
        programNames: startupProgramNames,
        diagnosticStatus:
          assessment?.status.replaceAll("_", " ") ?? "Sem diagnóstico",
        diagnosticScore:
          assessment?.validated_score ?? assessment?.self_score ?? null,
        evidenceCoverage: assessment?.evidence_coverage ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const diagnosed = latestAssessments.length;
  const active = scopedStartups.filter(
    (startup) => startup.status === "active",
  ).length;

  return {
    metrics: {
      total: scopedStartups.length,
      active,
      inactive: scopedStartups.length - active,
      diagnosed,
      diagnosticCoverage: scopedStartups.length
        ? Math.round((diagnosed / scopedStartups.length) * 100)
        : 0,
      averageValidatedScore: average(
        latestAssessments.map(
          (item) => item.validated_score ?? item.self_score,
        ),
      ),
      averageEvidenceCoverage: average(
        latestAssessments.map((item) => item.evidence_coverage),
      ),
    },
    statusDistribution: distribution(
      scopedStartups.map((startup) => startup.status),
      statusLabels,
    ),
    stageDistribution: distribution(
      scopedStartups.map((startup) => startup.stage),
      stageLabels,
    ),
    regionDistribution: distribution(
      scopedStartups.map((startup) => startup.state ?? "Não informada"),
    ),
    sectorDistribution: distribution(
      scopedStartups.map((startup) => startup.sector ?? "Não informado"),
    ).slice(0, 8),
    classificationDistribution: distribution(
      latestAssessments.map(
        (assessment) => assessment.classification_code ?? "Sem classificação",
      ),
    ),
    dimensionAverages,
    cohortSummaries,
    startupRows,
  };
}
