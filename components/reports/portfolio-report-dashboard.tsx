import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  Filter,
  Gauge,
  MapPinned,
  Rocket,
} from "lucide-react";
import Link from "next/link";

import { ReportExportButton } from "@/components/reports/report-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  DistributionPoint,
  PortfolioReport,
} from "@/lib/reports/portfolio-report";

const chartColors = [
  "#751118",
  "#d97918",
  "#5b9468",
  "#c4515b",
  "#8d6c55",
  "#d5a94d",
];
const startupStatusLabels: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  graduated: "Graduada",
  withdrawn: "Desistente",
  archived: "Arquivada",
};

const statusLabel = (status: string) =>
  startupStatusLabels[status] ?? status.replaceAll("_", " ");

function DistributionBars({
  title,
  eyebrow,
  points,
}: {
  title: string;
  eyebrow: string;
  points: DistributionPoint[];
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <section className="surface-card p-5 sm:p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="operational-heading mt-1 text-xl">{title}</h2>
      {points.length ? (
        <div className="mt-6 space-y-4">
          {points.map((point, index) => (
            <div key={point.key}>
              <div className="mb-1.5 flex justify-between gap-4 text-xs">
                <span className="truncate font-extrabold text-[var(--text-strong)]">
                  {point.label}
                </span>
                <span className="shrink-0 font-bold text-[var(--text-muted)]">
                  {point.value} · {point.percentage}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eee3dc]">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${Math.max(4, (point.value / max) * 100)}%`,
                    backgroundColor: chartColors[index % chartColors.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-[var(--surface-subtle)] p-5 text-sm text-[var(--text-muted)]">
          Ainda não há dados suficientes para este gráfico.
        </p>
      )}
    </section>
  );
}

function StatusDonut({ points }: { points: DistributionPoint[] }) {
  let cursor = 0;
  const gradient = points.length
    ? points
        .map((point, index) => {
          const start = cursor;
          cursor += point.percentage;
          return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
        })
        .join(", ")
    : "#eadfd8 0 100%";

  return (
    <section className="surface-card p-5 sm:p-6">
      <p className="eyebrow">Situação do portfólio</p>
      <h2 className="operational-heading mt-1 text-xl">Status das startups</h2>
      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[11rem_1fr]">
        <div
          className="relative mx-auto grid size-40 place-items-center rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
          role="img"
          aria-label={points
            .map((point) => `${point.label}: ${point.value}`)
            .join(", ")}
        >
          <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner">
            <span className="text-3xl font-black text-[var(--wine-950)]">
              {points.reduce((sum, point) => sum + point.value, 0)}
            </span>
          </div>
        </div>
        <ul className="space-y-3">
          {points.map((point, index) => (
            <li key={point.key} className="flex items-center gap-3 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: chartColors[index % chartColors.length],
                }}
              />
              <span className="flex-1 font-bold text-[var(--text)]">
                {point.label}
              </span>
              <strong className="text-[var(--text-strong)]">
                {point.value}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PortfolioReportDashboard({
  organizationSlug,
  incubatorSlug,
  incubatorName,
  programs,
  programTypes,
  cohorts,
  years,
  states,
  cities,
  statuses,
  selectedProgramId,
  selectedCohortId,
  selectedProgramTypeId,
  selectedYear,
  selectedState,
  selectedCity,
  selectedStatus,
  view,
  report,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  incubatorName: string;
  programs: Array<{ id: string; name: string; type_id: string }>;
  programTypes: Array<{ id: string; name: string }>;
  cohorts: Array<{
    id: string;
    program_id: string;
    name: string;
    code: string;
    starts_on: string;
  }>;
  years: string[];
  states: string[];
  cities: string[];
  statuses: string[];
  selectedProgramId?: string;
  selectedCohortId?: string;
  selectedProgramTypeId?: string;
  selectedYear?: string;
  selectedState?: string;
  selectedCity?: string;
  selectedStatus?: string;
  view: "overview" | "portfolio" | "diagnosticos" | "territorio";
  report: PortfolioReport;
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/indicadores`;
  const availablePrograms = programs.filter(
    (program) =>
      !selectedProgramTypeId || program.type_id === selectedProgramTypeId,
  );
  const availableProgramIds = new Set(
    availablePrograms.map((program) => program.id),
  );
  const availableCohorts = cohorts.filter((cohort) => {
    if (!availableProgramIds.has(cohort.program_id)) return false;
    if (selectedProgramId && cohort.program_id !== selectedProgramId)
      return false;
    if (selectedYear && cohort.starts_on.slice(0, 4) !== selectedYear)
      return false;
    return true;
  });
  const selectedProgram = programs.find(
    (program) => program.id === selectedProgramId,
  );
  const selectedCohort = cohorts.find(
    (cohort) => cohort.id === selectedCohortId,
  );
  const scopeLabel =
    [
      programTypes.find((item) => item.id === selectedProgramTypeId)?.name,
      selectedProgram?.name,
      selectedCohort?.name,
      selectedYear,
      selectedState,
      selectedCity,
      selectedStatus ? statusLabel(selectedStatus) : undefined,
    ]
      .filter(Boolean)
      .join(" · ") || "Toda a incubadora";
  const csvRows = report.startupRows.map((row) => ({
    Startup: row.name,
    Status: row.status,
    Estágio: row.stage,
    Região: row.region,
    Setor: row.sector,
    "Tipos de programa": row.programTypes.join(" · "),
    Programas: row.programNames.join(" · "),
    Turmas: row.cohorts,
    Diagnóstico: row.diagnosticStatus,
    "Score diagnóstico": row.diagnosticScore,
    "Cobertura de evidências": row.evidenceCoverage,
  }));

  return (
    <div className="page-enter space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#35070b_0%,#651017_58%,#913026_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(91,12,23,0.22)] sm:px-9 sm:py-10">
        <div className="absolute -top-24 right-10 size-72 rounded-full border border-[#f4c47a]/20" />
        <div className="absolute -right-20 -bottom-48 size-96 rounded-full bg-[#d97918]/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-black tracking-[0.15em] uppercase">
              <BarChart3 className="size-3.5 text-[#f4c47a]" /> Observatório da
              incubadora
            </p>
            <h1 className="display-heading mt-5 text-4xl text-white sm:text-5xl">
              Relatórios e indicadores
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/74 sm:text-base">
              Compare programas e turmas da {incubatorName}, acompanhe o perfil
              territorial do portfólio e transforme diagnósticos em decisões.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/15 bg-black/10 px-4 py-3 text-sm backdrop-blur">
              <span className="block text-[0.6rem] font-black tracking-[0.12em] text-white/55 uppercase">
                Recorte atual
              </span>
              <strong className="mt-1 block max-w-64 truncate">
                {scopeLabel}
              </strong>
            </div>
            <ReportExportButton
              filename={`relatorio-${incubatorSlug}.csv`}
              rows={csvRows}
            />
          </div>
        </div>
      </header>

      <form
        method="get"
        action={base}
        className="surface-card grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <input type="hidden" name="view" value={view} />
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Tipo de programa
          <select
            name="programType"
            defaultValue={selectedProgramTypeId ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todos os tipos</option>
            {programTypes.map((programType) => (
              <option key={programType.id} value={programType.id}>
                {programType.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Programa
          <select
            name="program"
            defaultValue={selectedProgramId ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todos os programas</option>
            {availablePrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Turma
          <select
            name="cohort"
            defaultValue={selectedCohortId ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todas as turmas</option>
            {availableCohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} · {cohort.code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Ano da turma
          <select
            name="year"
            defaultValue={selectedYear ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todos os anos</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Status da startup
          <select
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todos os status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Estado
          <select
            name="state"
            defaultValue={selectedState ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todos os estados</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold text-[var(--text-strong)]">
          Cidade
          <select
            name="city"
            defaultValue={selectedCity ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"
          >
            <option value="">Todas as cidades</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-4 xl:justify-end">
          <button className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--wine-800)] px-5 text-sm font-black text-white xl:flex-none">
            <Filter className="size-4" /> Aplicar filtros
          </button>
          <Link
            href={`${base}?view=${view}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-extrabold text-[var(--wine-800)] xl:flex-none"
          >
            Limpar
          </Link>
        </div>
      </form>

      <section
        aria-label="Indicadores principais"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          [
            Rocket,
            report.metrics.total,
            "Startups no recorte",
            `${report.metrics.active} ativas`,
          ],
          [
            CheckCircle2,
            `${report.metrics.diagnosticCoverage}%`,
            "Cobertura diagnóstica",
            `${report.metrics.diagnosed} avaliadas`,
          ],
          [
            Gauge,
            report.metrics.averageValidatedScore ?? "—",
            "Maturidade média",
            "Score mais recente",
          ],
          [
            FileCheck2,
            report.metrics.averageEvidenceCoverage == null
              ? "—"
              : `${report.metrics.averageEvidenceCoverage}%`,
            "Cobertura de evidências",
            "Média das avaliações",
          ],
        ].map(([Icon, value, label, hint]) => {
          const MetricIcon = Icon as typeof Rocket;
          return (
            <article key={String(label)} className="surface-card p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
                  <MetricIcon className="size-5" />
                </span>
                <strong className="display-heading text-3xl text-[var(--text-strong)]">
                  {String(value)}
                </strong>
              </div>
              <p className="mt-4 text-sm font-extrabold text-[var(--text-strong)]">
                {String(label)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {String(hint)}
              </p>
            </article>
          );
        })}
      </section>

      {view === "overview" ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <StatusDonut points={report.statusDistribution} />
            <DistributionBars
              eyebrow="Jornada empreendedora"
              title="Estágio de desenvolvimento"
              points={report.stageDistribution}
            />
          </section>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Programa → turma → startup</p>
                <h2 className="operational-heading mt-1 text-2xl">
                  Comparativo entre turmas
                </h2>
              </div>
              <StatusBadge>{report.cohortSummaries.length} turmas</StatusBadge>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {report.cohortSummaries.map((cohort) => (
                <article
                  key={cohort.id}
                  className="surface-card overflow-hidden p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{cohort.programName}</p>
                      <h3 className="operational-heading mt-1 text-xl">
                        {cohort.name}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {cohort.code}
                      </p>
                    </div>
                    <StatusBadge>
                      {cohort.status.replaceAll("_", " ")}
                    </StatusBadge>
                  </div>
                  <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-4 text-center">
                    {[
                      [cohort.startups, "Startups"],
                      [cohort.active, "Ativas"],
                      [cohort.diagnosed, "Avaliadas"],
                      [cohort.averageScore ?? "—", "Score"],
                    ].map(([value, label]) => (
                      <div key={String(label)}>
                        <dd className="text-xl font-black text-[var(--wine-950)]">
                          {value}
                        </dd>
                        <dt className="mt-1 text-[0.62rem] font-bold text-[var(--text-muted)] uppercase">
                          {label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                  {cohort.occupancy != null ? (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-bold text-[var(--text-muted)]">
                        <span>Ocupação</span>
                        <span>{cohort.occupancy}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee3dc]">
                        <div
                          className="h-full rounded-full bg-[#751118]"
                          style={{
                            width: `${Math.min(100, cohort.occupancy)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {view === "portfolio" ? (
        <>
          <section className="grid gap-6 xl:grid-cols-3">
            <StatusDonut points={report.statusDistribution} />
            <DistributionBars
              eyebrow="Maturidade de negócio"
              title="Estágio das startups"
              points={report.stageDistribution}
            />
            <DistributionBars
              eyebrow="Vocação econômica"
              title="Setores mais presentes"
              points={report.sectorDistribution}
            />
          </section>
          <StartupReportTable rows={report.startupRows} />
        </>
      ) : null}

      {view === "territorio" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <DistributionBars
            eyebrow="Distribuição territorial"
            title="Startups por estado"
            points={report.regionDistribution}
          />
          <section className="surface-card p-5 sm:p-6">
            <p className="eyebrow">Presença local</p>
            <h2 className="operational-heading mt-1 text-xl">
              Cidades representadas
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[...new Set(report.startupRows.map((row) => row.region))]
                .sort()
                .map((region) => {
                  const count = report.startupRows.filter(
                    (row) => row.region === region,
                  ).length;
                  return (
                    <div
                      key={region}
                      className="flex items-center gap-3 rounded-2xl bg-[var(--surface-subtle)] p-4"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-white text-[var(--wine-800)]">
                        <MapPinned className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-[var(--text-strong)]">
                          {region}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {count} startup{count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </section>
      ) : null}

      {view === "diagnosticos" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <DistributionBars
            eyebrow="Maturidade consolidada"
            title="Média por dimensão"
            points={report.dimensionAverages.map((item) => ({
              key: item.id,
              label: `${item.code ? `${item.code} · ` : ""}${item.name}`,
              value: Math.round(item.score),
              percentage: Math.round(item.score),
            }))}
          />
          <DistributionBars
            eyebrow="Resultados mais recentes"
            title="Classificações"
            points={report.classificationDistribution}
          />
        </section>
      ) : null}
    </div>
  );
}

function StartupReportTable({
  rows,
}: {
  rows: PortfolioReport["startupRows"];
}) {
  const groups = [...new Set(rows.flatMap((row) => row.programTypes))].sort(
    (a, b) => {
      if (a === "Sem programa") return 1;
      if (b === "Sem programa") return -1;
      return a.localeCompare(b, "pt-BR");
    },
  );

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Base analítica organizada</p>
          <h2 className="operational-heading mt-1 text-2xl">
            Startups por tipo de programa
          </h2>
        </div>
        <StatusBadge>{rows.length} startups</StatusBadge>
      </div>
      {groups.map((group) => {
        const groupRows = rows.filter((row) =>
          row.programTypes.includes(group),
        );
        return (
          <article key={group} className="surface-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[linear-gradient(90deg,#fff8f0,#fff)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[var(--wine-700)] uppercase">
                  Tipo de programa
                </p>
                <h3 className="operational-heading mt-1 text-xl">{group}</h3>
              </div>
              <StatusBadge>{groupRows.length}</StatusBadge>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[0.64rem] font-black tracking-[0.08em] text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-5 py-3">Startup</th>
                    <th className="px-5 py-3">Status / estágio</th>
                    <th className="px-5 py-3">Região</th>
                    <th className="px-5 py-3">Programa / turma</th>
                    <th className="px-5 py-3 text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {groupRows.map((row) => (
                    <tr key={`${group}-${row.id}`}>
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-[var(--text-strong)]">
                          {row.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {row.sector}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-[var(--text)]">
                          {row.status}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {row.stage}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-[var(--text)]">
                        {row.region}
                      </td>
                      <td className="max-w-72 px-5 py-4">
                        <p className="text-xs font-extrabold text-[var(--text-strong)]">
                          {row.programNames.join(" · ") || "Sem programa"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {row.cohorts}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="text-xl font-black text-[var(--wine-900)]">
                          {row.diagnosticScore ?? "—"}
                        </p>
                        <p className="text-[0.62rem] text-[var(--text-muted)] uppercase">
                          {row.diagnosticStatus}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
      {!rows.length ? (
        <div className="surface-card p-8 text-center text-sm text-[var(--text-muted)]">
          Nenhuma startup encontrada com os filtros selecionados.
        </div>
      ) : null}
    </section>
  );
}
