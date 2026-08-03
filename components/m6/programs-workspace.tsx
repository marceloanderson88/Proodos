import {
  Archive,
  CalendarDays,
  CircleDot,
  Factory,
  Flag,
  Layers3,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import {
  createCohortAction,
  createProgramAction,
  createProgramTypeAction,
  manageProgramLifecycleAction,
  updateProgramAction,
} from "@/app/(private)/o/[organizationSlug]/m6-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";
import { ProgramTypeNameField } from "@/components/m6/program-type-name-field";

type Incubator = { id: string; name: string };
type ProgramType = { id: string; name: string; incubator_id: string | null };
type Cohort = {
  id: string;
  program_id: string;
  name: string;
  code: string;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  capacity: number | null;
};
type Program = {
  id: string;
  incubator_id: string;
  type_id: string;
  name: string;
  code: string;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  description: string | null;
};
type Enrollment = { cohort_id: string; startup_id: string };

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  planned: "Planejado",
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
  archived: "Arquivado",
};

function dateLabel(value: string | null) {
  if (!value) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function ProgramsWorkspace({
  organizationSlug,
  incubatorSlug,
  incubators,
  programTypes,
  programs,
  cohorts,
  enrollments,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  incubators: Incubator[];
  programTypes: ProgramType[];
  programs: Program[];
  cohorts: Cohort[];
  enrollments: Enrollment[];
  success?: string;
  error?: string;
}) {
  const activePrograms = programs.filter(
    (program) => program.status === "active",
  ).length;
  const openCohorts = cohorts.filter((cohort) =>
    ["enrollment_open", "active"].includes(cohort.status),
  ).length;

  return (
    <div className="page-enter space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-[#751118]/10 bg-[#fffdf9] shadow-[0_18px_45px_rgb(63_9_13/7%)]">
        <div className="relative px-6 py-7 sm:px-8 sm:py-9">
          <div
            className="dot-field absolute top-0 right-0 h-full w-56 opacity-35"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf7ee] px-3 py-1.5 text-[0.65rem] font-black tracking-[0.12em] text-[#27643a] uppercase">
              <CircleDot className="size-3" aria-hidden="true" />
              Dados reais · Supabase
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] text-[#3f090d] sm:text-5xl">
              Programas e turmas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#766868]">
              Estruture os ciclos da incubadora e prepare as turmas que
              receberão as startups. Nenhum programa exige metodologia CERNE.
            </p>
          </div>
        </div>
        <dl className="grid border-t border-[#751118]/8 bg-[#f9eee5]/55 sm:grid-cols-3">
          {[
            { label: "Programas", metric: programs.length, Icon: Layers3 },
            { label: "Em andamento", metric: activePrograms, Icon: Flag },
            {
              label: "Turmas abertas/ativas",
              metric: openCohorts,
              Icon: UsersRound,
            },
          ].map(({ label, metric, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 border-b border-[#751118]/8 px-6 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
            >
              <Icon className="size-5 text-[#921a20]" aria-hidden="true" />
              <div>
                <dt className="text-[0.65rem] font-black tracking-[0.08em] text-[#806f6b] uppercase">
                  {label}
                </dt>
                <dd className="text-2xl font-black text-[#3f090d]">{metric}</dd>
              </div>
            </div>
          ))}
        </dl>
      </header>

      <FeedbackBanner success={success} error={error} />

      {incubators.length === 0 ? (
        <section className="dashboard-card rounded-[1.7rem] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f3dfd0] text-[#751118]">
              <Factory className="size-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-[#3f090d]">
                Primeiro, identifique a incubadora
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#766868]">
                Programas e startups pertencem a uma incubadora concreta dentro
                da organização.
              </p>
            </div>
          </div>
          <Link
            href="/o"
            className="mt-6 inline-flex rounded-xl bg-[#751118] px-5 py-3 text-sm font-black text-white"
          >
            Voltar à administração Proodos
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-3">
          <details
            className="dashboard-card group rounded-[1.6rem] p-5"
            open={programTypes.length === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                  Etapa 1
                </p>
                <h2 className="mt-1 text-xl font-black text-[#3f090d]">
                  Tipo de programa
                </h2>
              </div>
              <Plus className="size-5 text-[#921a20] transition group-open:rotate-45" />
            </summary>
            <form
              action={createProgramTypeAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
            >
              <Field label="Escopo" name="incubatorId">
                <select className={inputClassName} name="incubatorId" required>
                  {incubators.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <ProgramTypeNameField />
              <Field label="Descrição" name="description">
                <textarea
                  className={inputClassName}
                  name="description"
                  rows={2}
                />
              </Field>
              <SubmitButton>Criar tipo</SubmitButton>
            </form>
          </details>

          <details
            className="dashboard-card group rounded-[1.6rem] p-5"
            open={programs.length === 0 && programTypes.length > 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                  Etapa 2
                </p>
                <h2 className="mt-1 text-xl font-black text-[#3f090d]">
                  Novo programa
                </h2>
              </div>
              <Plus className="size-5 text-[#921a20] transition group-open:rotate-45" />
            </summary>
            <form
              action={createProgramAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Incubadora" name="incubatorId">
                  <select
                    className={inputClassName}
                    name="incubatorId"
                    required
                  >
                    <option value="">Selecione</option>
                    {incubators.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo" name="typeId">
                  <select className={inputClassName} name="typeId" required>
                    <option value="">Selecione</option>
                    {programTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                label="Nome"
                name="name"
                hint="O código técnico será criado automaticamente."
              >
                <input
                  className={inputClassName}
                  name="name"
                  required
                  placeholder="Ciclo de Pré-incubação"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Início" name="startsOn">
                  <input
                    className={inputClassName}
                    type="date"
                    name="startsOn"
                  />
                </Field>
                <Field label="Fim" name="endsOn">
                  <input className={inputClassName} type="date" name="endsOn" />
                </Field>
              </div>
              <Field label="Descrição" name="description">
                <textarea
                  className={inputClassName}
                  name="description"
                  rows={2}
                />
              </Field>
              <SubmitButton>Criar programa</SubmitButton>
            </form>
          </details>

          <details
            className="dashboard-card group rounded-[1.6rem] p-5"
            open={cohorts.length === 0 && programs.length > 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                  Etapa 3
                </p>
                <h2 className="mt-1 text-xl font-black text-[#3f090d]">
                  Nova turma
                </h2>
              </div>
              <Plus className="size-5 text-[#921a20] transition group-open:rotate-45" />
            </summary>
            <form
              action={createCohortAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
            >
              <Field label="Programa" name="programId">
                <select className={inputClassName} name="programId" required>
                  <option value="">Selecione</option>
                  {programs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Nome"
                name="name"
                hint="O código técnico será criado automaticamente."
              >
                <input
                  className={inputClassName}
                  name="name"
                  required
                  placeholder="Turma 1"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Início" name="startsOn">
                  <input
                    className={inputClassName}
                    type="date"
                    name="startsOn"
                  />
                </Field>
                <Field label="Fim" name="endsOn">
                  <input className={inputClassName} type="date" name="endsOn" />
                </Field>
              </div>
              <Field label="Capacidade" name="capacity">
                <input
                  className={inputClassName}
                  type="number"
                  name="capacity"
                  min={1}
                  max={100000}
                  placeholder="20"
                />
              </Field>
              <SubmitButton>Criar turma</SubmitButton>
            </form>
          </details>
        </section>
      )}

      <section aria-labelledby="portfolio-programas">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-black tracking-[0.14em] text-[#921a20] uppercase">
              Portfólio operacional
            </p>
            <h2
              id="portfolio-programas"
              className="mt-1 text-3xl font-black text-[#3f090d]"
            >
              Programas cadastrados
            </h2>
          </div>
          <span className="rounded-full border border-[#751118]/10 bg-white px-3 py-1.5 text-xs font-bold text-[#766868]">
            {programs.length} registros
          </span>
        </div>
        {programs.length === 0 ? (
          <div className="dashboard-card rounded-2xl p-8 text-center text-sm text-[#766868]">
            Nenhum programa cadastrado. Conclua as etapas acima para iniciar o
            portfólio.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
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
              const incubator = incubators.find(
                (item) => item.id === program.incubator_id,
              );
              const type = programTypes.find(
                (item) => item.id === program.type_id,
              );
              return (
                <article
                  key={program.id}
                  className="dashboard-card stagger-item rounded-[1.6rem] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[#f4e2d5] px-2 py-1 text-[0.6rem] font-black tracking-[0.08em] text-[#751118]">
                          {program.code}
                        </span>
                        <span className="text-[0.65rem] font-bold text-[#8b7c76]">
                          {type?.name ?? "Tipo indisponível"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-black text-[#3f090d]">
                        {program.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#806f6b]">
                        {incubator?.name}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f7ebe4] px-3 py-1.5 text-[0.65rem] font-black text-[#751118]">
                      {statusLabel[program.status] ?? program.status}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-[#751118]/8 pt-4 text-xs text-[#6d5c58]">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-[#921a20]" />
                      {dateLabel(program.starts_on)} —{" "}
                      {dateLabel(program.ends_on)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <UsersRound className="size-4 text-[#921a20]" />
                      {programCohorts.length} turma(s)
                    </span>
                  </div>
                  {programCohorts.length > 0 && (
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {programCohorts.map((cohort) => (
                        <li
                          key={cohort.id}
                          className="rounded-xl border border-[#751118]/8 bg-white/70 px-3 py-3"
                        >
                          <p className="text-xs font-black text-[#5c0c12]">
                            {cohort.name}
                          </p>
                          <p className="mt-1 text-[0.62rem] text-[#887875]">
                            {cohort.code} ·{" "}
                            {cohort.capacity
                              ? `${cohort.capacity} vagas`
                              : "sem limite definido"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {program.status !== "archived" && (
                    <div className="mt-5 border-t border-[#751118]/8 pt-4">
                      <details className="group/edit rounded-2xl border border-[#751118]/10 bg-white/65 p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-[#5c0c12]">
                          <span className="inline-flex items-center gap-2">
                            <Pencil className="size-4" aria-hidden="true" />
                            Editar programa
                          </span>
                          <Plus className="size-4 transition group-open/edit:rotate-45" />
                        </summary>
                        <form
                          action={updateProgramAction.bind(
                            null,
                            organizationSlug,
                            incubatorSlug,
                          )}
                          className="mt-4 space-y-4 border-t border-[#751118]/8 pt-4"
                        >
                          <input
                            type="hidden"
                            name="programId"
                            value={program.id}
                          />
                          <input
                            type="hidden"
                            name="incubatorId"
                            value={program.incubator_id}
                          />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nome" name={`name-${program.id}`}>
                              <input
                                className={inputClassName}
                                name="name"
                                required
                                defaultValue={program.name}
                              />
                            </Field>
                            <Field label="Tipo" name={`type-${program.id}`}>
                              <select
                                className={inputClassName}
                                name="typeId"
                                required
                                defaultValue={program.type_id}
                              >
                                {programTypes.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Status" name={`status-${program.id}`}>
                              <select
                                className={inputClassName}
                                name="status"
                                defaultValue={program.status}
                              >
                                <option value="draft">Rascunho</option>
                                <option value="planned">Planejado</option>
                                <option value="active">Em andamento</option>
                                <option value="completed">Concluído</option>
                                <option value="cancelled">Cancelado</option>
                              </select>
                            </Field>
                            <Field label="Início" name={`starts-${program.id}`}>
                              <input
                                className={inputClassName}
                                type="date"
                                name="startsOn"
                                defaultValue={program.starts_on ?? ""}
                              />
                            </Field>
                            <Field label="Fim" name={`ends-${program.id}`}>
                              <input
                                className={inputClassName}
                                type="date"
                                name="endsOn"
                                defaultValue={program.ends_on ?? ""}
                              />
                            </Field>
                          </div>
                          <Field
                            label="Descrição"
                            name={`description-${program.id}`}
                          >
                            <textarea
                              className={inputClassName}
                              name="description"
                              rows={3}
                              defaultValue={program.description ?? ""}
                            />
                          </Field>
                          <SubmitButton>Salvar alterações</SubmitButton>
                        </form>
                      </details>

                      <form
                        action={manageProgramLifecycleAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                        className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fbf5ef] p-4"
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
                        <p className="max-w-md text-xs leading-5 text-[#766868]">
                          {linkedStartupCount > 0
                            ? `${linkedStartupCount} startup(s) vinculada(s). O histórico será preservado.`
                            : "Sem startups vinculadas. A exclusão removerá o programa do portfólio ativo."}
                        </p>
                        <button
                          type="submit"
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#921a20]/20 bg-white px-4 py-2 text-xs font-black text-[#751118] transition hover:border-[#921a20]/40 hover:bg-[#fff8f3]"
                        >
                          {linkedStartupCount > 0 ? (
                            <Archive className="size-4" aria-hidden="true" />
                          ) : (
                            <Trash2 className="size-4" aria-hidden="true" />
                          )}
                          {linkedStartupCount > 0
                            ? "Arquivar programa"
                            : "Excluir programa"}
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
