import {
  Archive,
  ArrowRight,
  CalendarDays,
  CircleDot,
  Flag,
  Layers3,
  Plus,
  Rocket,
  Trash2,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  createCohortAction,
  manageProgramLifecycleAction,
} from "@/app/(private)/o/[organizationSlug]/m6-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { ProgramCreateForm } from "@/components/programs/program-create-form";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

type ProgramType = { id: string; name: string };
type Cohort = {
  id: string;
  program_id: string;
  name: string;
  code: string;
  status: string;
  launches_on: string;
  enrollment_starts_on: string | null;
  enrollment_ends_on: string | null;
  starts_on: string;
  ends_on: string | null;
  capacity: number | null;
};
type Program = {
  id: string;
  type_id: string;
  name: string;
  code: string;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  description: string | null;
  objectives: string | null;
  target_audience: string | null;
  delivery_mode: "in_person" | "remote" | "hybrid" | null;
  duration_weeks: number | null;
  suggested_capacity: number | null;
  logo_url: string | null;
};
type Enrollment = { cohort_id: string; startup_id: string };

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  planned: "Planejado",
  active: "Publicado",
  enrollment_open: "Inscrições abertas",
  completed: "Concluído",
  cancelled: "Cancelado",
  archived: "Arquivado",
};
const deliveryLabels = {
  in_person: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
} as const;

function dateLabel(value: string | null) {
  if (!value) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function ProgramsWorkspace({
  view,
  organizationSlug,
  incubatorSlug,
  programTypes,
  programs,
  cohorts,
  enrollments,
  success,
  error,
}: {
  view: "portfolio" | "novo" | "turmas";
  organizationSlug: string;
  incubatorSlug: string;
  programTypes: ProgramType[];
  programs: Program[];
  cohorts: Cohort[];
  enrollments: Enrollment[];
  success?: string;
  error?: string;
}) {
  const publishedPrograms = programs.filter(
    (program) => program.status === "active",
  ).length;
  const runningCohorts = cohorts.filter((cohort) =>
    ["enrollment_open", "active"].includes(cohort.status),
  ).length;
  const pageCopy = {
    portfolio: {
      eyebrow: "Portfólio da incubadora",
      title: "Programas",
      description:
        "Consulte o catálogo de programas e acompanhe suas execuções em um só panorama.",
    },
    novo: {
      eyebrow: "Catálogo",
      title: "Novo programa",
      description:
        "Estruture um novo modelo de desenvolvimento para reutilizar em diferentes turmas.",
    },
    turmas: {
      eyebrow: "Execução",
      title: "Turmas",
      description:
        "Crie ciclos, defina períodos de inscrição e organize a capacidade de atendimento.",
    },
  }[view];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow={pageCopy.eyebrow}
        title={pageCopy.title}
        description={pageCopy.description}
        icon={Layers3}
        actions={
          view === "novo" ? (
            <Link
              href={`/o/${organizationSlug}/i/${incubatorSlug}/programas`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-extrabold text-[var(--wine-800)] transition hover:bg-[var(--surface-subtle)]"
            >
              Voltar ao catálogo
            </Link>
          ) : (
            <Link
              href={`/o/${organizationSlug}/i/${incubatorSlug}/programas?view=novo`}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--wine-800)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--wine-700)]"
            >
              <Plus className="size-4" /> Novo programa
            </Link>
          )
        }
      />
      <FeedbackBanner success={success} error={error} />

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          [programs.length, "Programas", Layers3],
          [publishedPrograms, "Publicados", Flag],
          [runningCohorts, "Turmas abertas/ativas", UsersRound],
        ].map(([value, label, Icon]) => {
          const MetricIcon = Icon as typeof Layers3;
          return (
            <div
              key={String(label)}
              className="surface-card flex items-center gap-4 p-5"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
                <MetricIcon className="size-5" />
              </span>
              <div>
                <dt className="text-[0.65rem] font-extrabold text-[var(--text-muted)] uppercase">
                  {String(label)}
                </dt>
                <dd className="text-2xl font-black text-[var(--wine-950)]">
                  {Number(value)}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      <section
        className={`${view === "novo" || view === "turmas" ? "grid" : "hidden"} gap-5 xl:grid-cols-2`}
      >
        <details
          className={`${view === "novo" ? "block" : "hidden"} surface-card group p-5`}
          open={view === "novo"}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Catálogo</p>
              <h2 className="operational-heading mt-1 text-xl">
                Novo programa
              </h2>
            </div>
            <Plus className="size-5 text-[var(--wine-700)] transition group-open:rotate-45" />
          </summary>
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <ProgramCreateForm
              organizationSlug={organizationSlug}
              incubatorSlug={incubatorSlug}
            />
          </div>
        </details>

        <details
          className={`${view === "turmas" ? "block" : "hidden"} surface-card group p-5`}
          open={view === "turmas"}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Execução</p>
              <h2 className="operational-heading mt-1 text-xl">Nova turma</h2>
            </div>
            <Plus className="size-5 text-[var(--wine-700)] transition group-open:rotate-45" />
          </summary>
          <form
            action={createCohortAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-5 space-y-4 border-t border-[var(--border)] pt-5"
          >
            <FormField label="Programa" htmlFor="cohort-program" required>
              <select
                id="cohort-program"
                className={controlClassName}
                name="programId"
                required
              >
                <option value="">Selecione</option>
                {programs
                  .filter((item) => item.status !== "archived")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nome da turma"
                htmlFor="cohort-name"
                required
                hint="O código será automático."
              >
                <input
                  id="cohort-name"
                  className={controlClassName}
                  name="name"
                  required
                  placeholder="Turma 2027.1"
                />
              </FormField>
              <FormField label="Capacidade" htmlFor="cohort-capacity">
                <input
                  id="cohort-capacity"
                  className={controlClassName}
                  name="capacity"
                  type="number"
                  min={1}
                />
              </FormField>
            </div>
            <FormField
              label="Data de lançamento"
              htmlFor="cohort-launch"
              required
            >
              <input
                id="cohort-launch"
                className={controlClassName}
                type="date"
                name="launchesOn"
                required
              />
            </FormField>
            <fieldset className="rounded-2xl border border-[var(--border)] p-4">
              <legend className="px-2 text-xs font-extrabold text-[var(--wine-800)]">
                Inscrições opcionais
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Abertura" htmlFor="cohort-enrollment-start">
                  <input
                    id="cohort-enrollment-start"
                    className={controlClassName}
                    type="date"
                    name="enrollmentStartsOn"
                  />
                </FormField>
                <FormField label="Encerramento" htmlFor="cohort-enrollment-end">
                  <input
                    id="cohort-enrollment-end"
                    className={controlClassName}
                    type="date"
                    name="enrollmentEndsOn"
                  />
                </FormField>
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Início do ciclo"
                htmlFor="cohort-start"
                required
              >
                <input
                  id="cohort-start"
                  className={controlClassName}
                  type="date"
                  name="startsOn"
                  required
                />
              </FormField>
              <FormField label="Fim do ciclo" htmlFor="cohort-end">
                <input
                  id="cohort-end"
                  className={controlClassName}
                  type="date"
                  name="endsOn"
                />
              </FormField>
            </div>
            <Button type="submit">Criar turma</Button>
          </form>
        </details>
      </section>

      <section className={view === "turmas" ? "space-y-4" : "hidden"}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Ciclos de execução</p>
            <h2 className="operational-heading mt-1 text-2xl">
              Turmas cadastradas
            </h2>
          </div>
          <StatusBadge>{cohorts.length} turmas</StatusBadge>
        </div>
        {cohorts.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Nenhuma turma cadastrada"
            description="Crie a primeira turma para iniciar um novo ciclo de execução."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cohorts.map((cohort) => {
              const program = programs.find(
                (item) => item.id === cohort.program_id,
              );
              const startupCount = new Set(
                enrollments
                  .filter((item) => item.cohort_id === cohort.id)
                  .map((item) => item.startup_id),
              ).size;
              return (
                <article key={cohort.id} className="surface-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{program?.name ?? "Programa"}</p>
                      <h3 className="operational-heading mt-1 text-xl">
                        {cohort.name}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {cohort.code}
                      </p>
                    </div>
                    <StatusBadge>
                      {statusLabels[cohort.status] ?? cohort.status}
                    </StatusBadge>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">
                        Início
                      </dt>
                      <dd className="mt-1 font-extrabold text-[var(--text-strong)]">
                        {dateLabel(cohort.starts_on)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">
                        Startups
                      </dt>
                      <dd className="mt-1 font-extrabold text-[var(--text-strong)]">
                        {startupCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">
                        Capacidade
                      </dt>
                      <dd className="mt-1 font-extrabold text-[var(--text-strong)]">
                        {cohort.capacity ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        aria-labelledby="program-portfolio"
        className={view === "portfolio" ? "space-y-4" : "hidden"}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Catálogo operacional</p>
            <h2
              id="program-portfolio"
              className="mt-1 text-3xl font-black text-[var(--wine-950)]"
            >
              Programas cadastrados
            </h2>
          </div>
          <StatusBadge>{programs.length} registros</StatusBadge>
        </div>
        {programs.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="Nenhum programa cadastrado"
            description="Crie o modelo do programa e, depois, a primeira turma de execução."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {programs.map((program) => {
              const programCohorts = cohorts.filter(
                (cohort) => cohort.program_id === program.id,
              );
              const cohortIds = new Set(
                programCohorts.map((cohort) => cohort.id),
              );
              const linkedStartupCount = new Set(
                enrollments
                  .filter((enrollment) => cohortIds.has(enrollment.cohort_id))
                  .map((enrollment) => enrollment.startup_id),
              ).size;
              const type = programTypes.find(
                (item) => item.id === program.type_id,
              );
              const readiness = [
                program.description,
                program.objectives,
                program.target_audience,
                program.delivery_mode,
              ].filter(Boolean).length;
              return (
                <article
                  key={program.id}
                  className="surface-card overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                        {program.logo_url ? (
                          <Image
                            src={program.logo_url}
                            alt={`Logo de ${program.name}`}
                            fill
                            unoptimized
                            className="object-contain p-2"
                          />
                        ) : (
                          <Layers3 className="size-7 text-[var(--wine-700)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            tone={
                              program.status === "active"
                                ? "success"
                                : program.status === "draft"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {statusLabels[program.status] ?? program.status}
                          </StatusBadge>
                          <span className="text-[0.68rem] font-bold text-[var(--text-muted)]">
                            {type?.name ?? "Tipo indisponível"}
                          </span>
                        </div>
                        <h3 className="mt-2 text-2xl font-black text-[var(--wine-950)]">
                          {program.name}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                          {program.description ??
                            "Descrição ainda não preenchida."}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-[var(--surface-subtle)] p-4 text-center">
                      <div>
                        <p className="text-lg font-black">
                          {programCohorts.length}
                        </p>
                        <p className="text-[0.62rem] text-[var(--text-muted)] uppercase">
                          Turmas
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-black">
                          {linkedStartupCount}
                        </p>
                        <p className="text-[0.62rem] text-[var(--text-muted)] uppercase">
                          Startups
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-black">{readiness}/4</p>
                        <p className="text-[0.62rem] text-[var(--text-muted)] uppercase">
                          Preparação
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                      {program.delivery_mode && (
                        <span className="inline-flex items-center gap-1.5">
                          <CircleDot className="size-3.5 text-[var(--wine-700)]" />
                          {deliveryLabels[program.delivery_mode]}
                        </span>
                      )}
                      {program.duration_weeks && (
                        <span>{program.duration_weeks} semanas</span>
                      )}
                      {program.starts_on && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-[var(--wine-700)]" />
                          Vigência: {dateLabel(program.starts_on)} —{" "}
                          {dateLabel(program.ends_on)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
                    <Link
                      href={`/o/${organizationSlug}/i/${incubatorSlug}/programas/${program.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--wine-800)] px-4 py-3 text-sm font-extrabold text-white hover:bg-[var(--wine-700)]"
                    >
                      Abrir programa <ArrowRight className="size-4" />
                    </Link>
                    {program.status !== "archived" && (
                      <form
                        action={manageProgramLifecycleAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="programId"
                          value={program.id}
                        />
                        <input
                          type="hidden"
                          name="action"
                          value={linkedStartupCount > 0 ? "archive" : "delete"}
                        />
                        <ConfirmSubmitButton
                          message={
                            linkedStartupCount > 0
                              ? `Arquivar ${program.name} preservando ${linkedStartupCount} vínculo(s)?`
                              : `Excluir o programa vazio ${program.name}?`
                          }
                        >
                          {linkedStartupCount > 0 ? (
                            <Archive className="size-4" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          {linkedStartupCount > 0 ? "Arquivar" : "Excluir"}
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
