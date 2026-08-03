import {
  Building2,
  CircleDot,
  Link2,
  MapPin,
  Plus,
  Rocket,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

import {
  addStartupMemberAction,
  createStartupAction,
  enrollStartupAction,
} from "@/app/(private)/o/[organizationSlug]/m6-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";

type Incubator = { id: string; name: string };
type Startup = {
  id: string;
  code: string;
  incubator_id: string;
  name: string;
  legal_name: string | null;
  sector: string | null;
  stage: string;
  status: string;
  city: string | null;
  state: string | null;
};
type StartupMember = {
  id: string;
  startup_id: string;
  full_name: string;
  role: string;
  role_title: string | null;
  is_representative: boolean;
};
type CohortOption = {
  id: string;
  name: string;
  programName: string;
};
type Enrollment = {
  id: string;
  startup_id: string;
  cohort_id: string;
  status: string;
  entry_date: string;
};

const stageLabel: Record<string, string> = {
  idea: "Ideia",
  validation: "Validação",
  operation: "Operação",
  traction: "Tração",
  scale: "Escala",
  graduated: "Graduada",
};

const memberRoleLabel: Record<string, string> = {
  founder: "Fundador(a)",
  cofounder: "Cofundador(a)",
  representative: "Representante",
  employee: "Colaborador(a)",
  advisor: "Conselheiro(a)",
  other: "Outro",
};

export function StartupsWorkspace({
  organizationSlug,
  incubatorSlug,
  incubators,
  startups,
  members,
  cohorts,
  enrollments,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  incubators: Incubator[];
  startups: Startup[];
  members: StartupMember[];
  cohorts: CohortOption[];
  enrollments: Enrollment[];
  success?: string;
  error?: string;
}) {
  const enrolledStartupIds = new Set(
    enrollments
      .filter((item) =>
        ["invited", "active", "suspended"].includes(item.status),
      )
      .map((item) => item.startup_id),
  );
  const teamSize = members.filter((item) => item.role !== "advisor").length;

  return (
    <div className="page-enter space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#5c0c12,#751118_62%,#9b2b2d)] px-6 py-8 text-white shadow-[0_22px_55px_rgb(63_9_13/18%)] sm:px-8 sm:py-10">
        <div
          className="absolute -top-24 -right-20 size-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute right-14 -bottom-32 size-64 rounded-full bg-[#f4c47a]/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-black tracking-[0.12em] uppercase">
              <CircleDot className="size-3 text-[#f4c47a]" />
              Portfólio real e protegido
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Startups e equipes
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Cadastre os empreendimentos, organize as equipes e vincule cada
              startup à turma correta. O histórico nasce junto com cada
              operação.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            {[
              { label: "Startups", value: startups.length },
              { label: "Matriculadas", value: enrolledStartupIds.size },
              { label: "Pessoas", value: teamSize },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-white/9 px-3 py-4 text-center backdrop-blur"
              >
                <dt className="text-[0.58rem] font-black tracking-[0.08em] text-white/60 uppercase">
                  {metric.label}
                </dt>
                <dd className="mt-1 text-2xl font-black text-white">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <FeedbackBanner success={success} error={error} />

      {incubators.length === 0 ? (
        <section className="dashboard-card rounded-2xl p-7 text-center">
          <Building2 className="mx-auto size-8 text-[#921a20]" />
          <h2 className="mt-3 text-2xl font-black text-[#3f090d]">
            Cadastre uma incubadora primeiro
          </h2>
          <p className="mt-2 text-sm text-[#766868]">
            Use o módulo Programas para criar a estrutura gestora antes de
            adicionar startups.
          </p>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-3">
          <details
            className="dashboard-card group rounded-[1.6rem] p-5"
            open={startups.length === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                  Portfólio
                </p>
                <h2 className="mt-1 text-xl font-black text-[#3f090d]">
                  Cadastrar startup
                </h2>
              </div>
              <Plus className="size-5 text-[#921a20] transition group-open:rotate-45" />
            </summary>
            <form
              action={createStartupAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
            >
              <Field label="Incubadora" name="incubatorId">
                <select className={inputClassName} name="incubatorId" required>
                  <option value="">Selecione</option>
                  {incubators.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field
                  label="Nome"
                  name="name"
                  hint="O código técnico será criado automaticamente."
                >
                  <input
                    className={inputClassName}
                    name="name"
                    required
                    placeholder="Nome da startup"
                  />
                </Field>
                <Field label="Razão social" name="legalName">
                  <input className={inputClassName} name="legalName" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Estágio" name="stage">
                  <select
                    className={inputClassName}
                    name="stage"
                    defaultValue="idea"
                  >
                    <option value="idea">Ideia</option>
                    <option value="validation">Validação</option>
                    <option value="operation">Operação</option>
                    <option value="traction">Tração</option>
                    <option value="scale">Escala</option>
                  </select>
                </Field>
                <Field label="Setor" name="sector">
                  <input
                    className={inputClassName}
                    name="sector"
                    placeholder="Agtech, educação..."
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Cidade" name="city">
                  <input className={inputClassName} name="city" />
                </Field>
                <Field label="Estado" name="state">
                  <input className={inputClassName} name="state" />
                </Field>
              </div>
              <Field label="CNPJ ou registro" name="taxId">
                <input className={inputClassName} name="taxId" />
              </Field>
              <Field label="Site" name="websiteUrl">
                <input
                  className={inputClassName}
                  type="url"
                  name="websiteUrl"
                  placeholder="https://"
                />
              </Field>
              <Field label="Modelo de negócio" name="businessModel">
                <textarea
                  className={inputClassName}
                  name="businessModel"
                  rows={3}
                />
              </Field>
              <SubmitButton>Cadastrar startup</SubmitButton>
            </form>
          </details>

          <details
            className="dashboard-card group rounded-[1.6rem] p-5"
            open={members.length === 0 && startups.length > 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                  Equipe
                </p>
                <h2 className="mt-1 text-xl font-black text-[#3f090d]">
                  Adicionar membro
                </h2>
              </div>
              <UserPlus className="size-5 text-[#921a20]" />
            </summary>
            <form
              action={addStartupMemberAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
            >
              <Field label="Startup" name="startupId">
                <select className={inputClassName} name="startupId" required>
                  <option value="">Selecione</option>
                  {startups.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nome completo" name="fullName">
                <input className={inputClassName} name="fullName" required />
              </Field>
              <Field
                label="E-mail"
                name="email"
                hint="O cadastro da equipe não cria uma conta de acesso automaticamente."
              >
                <input className={inputClassName} type="email" name="email" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Vínculo" name="role">
                  <select
                    className={inputClassName}
                    name="role"
                    defaultValue="founder"
                  >
                    <option value="founder">Fundador(a)</option>
                    <option value="cofounder">Cofundador(a)</option>
                    <option value="representative">Representante</option>
                    <option value="employee">Colaborador(a)</option>
                    <option value="advisor">Conselheiro(a)</option>
                    <option value="other">Outro</option>
                  </select>
                </Field>
                <Field label="Função" name="roleTitle">
                  <input
                    className={inputClassName}
                    name="roleTitle"
                    placeholder="CEO, Produto..."
                  />
                </Field>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-[#751118]/10 bg-[#fbf5ef] p-3 text-xs leading-5 text-[#5b4545]">
                <input
                  className="mt-0.5 size-4 accent-[#751118]"
                  type="checkbox"
                  name="isRepresentative"
                />
                <span>
                  <strong className="block text-[#3f090d]">
                    Representa a startup
                  </strong>
                  Poderá gerenciar a própria equipe quando a conta for
                  vinculada.
                </span>
              </label>
              <SubmitButton>Adicionar à equipe</SubmitButton>
            </form>
          </details>

          <details
            className="dashboard-card group rounded-[1.6rem] p-5"
            open={
              enrollments.length === 0 &&
              startups.length > 0 &&
              cohorts.length > 0
            }
          >
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                  Participação
                </p>
                <h2 className="mt-1 text-xl font-black text-[#3f090d]">
                  Vincular à turma
                </h2>
              </div>
              <Link2 className="size-5 text-[#921a20]" />
            </summary>
            <form
              action={enrollStartupAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
            >
              <Field label="Startup" name="startupId">
                <select className={inputClassName} name="startupId" required>
                  <option value="">Selecione</option>
                  {startups.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Turma" name="cohortId">
                <select className={inputClassName} name="cohortId" required>
                  <option value="">Selecione</option>
                  {cohorts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.programName} · {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data de entrada" name="entryDate">
                <input
                  className={inputClassName}
                  type="date"
                  name="entryDate"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              {cohorts.length === 0 && (
                <p className="rounded-xl bg-[#fff4de] p-3 text-xs leading-5 text-[#70440d]">
                  Crie uma turma no módulo Programas antes de matricular
                  startups.
                </p>
              )}
              <SubmitButton>Vincular ou mover startup</SubmitButton>
            </form>
          </details>
        </section>
      )}

      <section aria-labelledby="portfolio-startups">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-black tracking-[0.14em] text-[#921a20] uppercase">
              Acompanhamento
            </p>
            <h2
              id="portfolio-startups"
              className="mt-1 text-3xl font-black text-[#3f090d]"
            >
              Portfólio de startups
            </h2>
          </div>
          <span className="rounded-full border border-[#751118]/10 bg-white px-3 py-1.5 text-xs font-bold text-[#766868]">
            {startups.length} registros
          </span>
        </div>
        {startups.length === 0 ? (
          <div className="dashboard-card rounded-2xl p-8 text-center">
            <Rocket className="mx-auto size-8 text-[#921a20]" />
            <p className="mt-3 text-sm text-[#766868]">
              Nenhuma startup cadastrada neste tenant.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {startups.map((startup, index) => {
              const startupMembers = members.filter(
                (member) => member.startup_id === startup.id,
              );
              const startupEnrollments = enrollments.filter(
                (enrollment) => enrollment.startup_id === startup.id,
              );
              const incubator = incubators.find(
                (item) => item.id === startup.incubator_id,
              );
              return (
                <article
                  key={startup.id}
                  className="dashboard-card stagger-item overflow-hidden rounded-[1.7rem]"
                  style={{ "--stagger": index + 1 } as React.CSSProperties}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f3dfd0] text-[#751118]">
                          <Rocket className="size-6" />
                        </span>
                        <div>
                          <p className="text-[0.6rem] font-black tracking-[0.1em] text-[#921a20]">
                            {startup.code}
                          </p>
                          <h3 className="text-2xl font-black text-[#3f090d]">
                            {startup.name}
                          </h3>
                          <p className="mt-1 text-xs text-[#806f6b]">
                            {startup.sector ?? "Setor não informado"}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#edf7ee] px-3 py-1.5 text-[0.62rem] font-black text-[#27643a]">
                        {stageLabel[startup.stage] ?? startup.stage}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#6d5c58]">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-4 text-[#921a20]" />
                        {incubator?.name}
                      </span>
                      {startup.city && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4 text-[#921a20]" />
                          {startup.city}
                          {startup.state ? `, ${startup.state}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-px bg-[#751118]/8 sm:grid-cols-2">
                    <div className="bg-[#fffaf5] p-4">
                      <div className="flex items-center gap-2">
                        <UsersRound className="size-4 text-[#921a20]" />
                        <h4 className="font-[family-name:var(--font-body)] text-xs font-black text-[#5c0c12]">
                          Equipe · {startupMembers.length}
                        </h4>
                      </div>
                      {startupMembers.length === 0 ? (
                        <p className="mt-3 text-[0.65rem] text-[#8b7c76]">
                          Sem membros cadastrados.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {startupMembers.slice(0, 3).map((member) => (
                            <li
                              key={member.id}
                              className="flex items-center justify-between gap-2 text-[0.65rem]"
                            >
                              <span className="truncate font-bold text-[#5b4545]">
                                {member.full_name}
                              </span>
                              <span className="shrink-0 text-[#8b7c76]">
                                {member.role_title ??
                                  memberRoleLabel[member.role] ??
                                  member.role}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="bg-[#fffaf5] p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-[#921a20]" />
                        <h4 className="font-[family-name:var(--font-body)] text-xs font-black text-[#5c0c12]">
                          Programas · {startupEnrollments.length}
                        </h4>
                      </div>
                      {startupEnrollments.length === 0 ? (
                        <p className="mt-3 text-[0.65rem] text-[#8b7c76]">
                          Ainda não matriculada.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {startupEnrollments.slice(0, 3).map((enrollment) => {
                            const cohort = cohorts.find(
                              (item) => item.id === enrollment.cohort_id,
                            );
                            return (
                              <li
                                key={enrollment.id}
                                className="text-[0.65rem]"
                              >
                                <p className="truncate font-bold text-[#5b4545]">
                                  {cohort?.programName ?? "Programa"}
                                </p>
                                <p className="mt-0.5 truncate text-[#8b7c76]">
                                  {cohort?.name ?? "Turma"} ·{" "}
                                  {enrollment.status}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
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
