import {
  CircleDot,
  Link2,
  MapPin,
  Plus,
  Rocket,
  Sparkles,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import {
  inviteStartupAction,
  reviewStartupApplicationAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/startups/actions";
import {
  addStartupMemberAction,
  enrollStartupAction,
} from "@/app/(private)/o/[organizationSlug]/m6-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";

type Startup = {
  id: string;
  code: string;
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
type StartupApplication = {
  id: string;
  applicant_name: string;
  applicant_email: string;
  startup_name: string;
  sector: string | null;
  stage: string;
  created_at: string;
};
type StartupInvitation = {
  id: string;
  email: string;
  invited_name: string | null;
  status: string;
  expires_at: string;
  startupName: string;
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
  startups,
  members,
  cohorts,
  enrollments,
  applications,
  invitations,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  startups: Startup[];
  members: StartupMember[];
  cohorts: CohortOption[];
  enrollments: Enrollment[];
  applications: StartupApplication[];
  invitations: StartupInvitation[];
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
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href={`/o/${organizationSlug}/i/${incubatorSlug}/startups/nova`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#751118] shadow-lg shadow-black/10"
            >
              <Plus className="size-4" /> Cadastrar startup
            </Link>
            <Link
              href={`/cadastro/startup/${organizationSlug}/${incubatorSlug}`}
              target="_blank"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white"
            >
              Abrir autocadastro
            </Link>
          </div>
        </div>
      </header>

      <FeedbackBanner success={success} error={error} />

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="dashboard-card rounded-[1.7rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                Entrada pela startup
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#3f090d]">
                Solicitações pendentes
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#806f69]">
                A aprovação cria a startup, ativa o representante e preserva o
                vínculo solicitado.
              </p>
            </div>
            <span className="rounded-full bg-[#fff1dc] px-3 py-1.5 text-xs font-black text-[#8a5411]">
              {applications.length}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {applications.length ? (
              applications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-[#751118]/10 bg-[#fffaf6] p-4"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <h3 className="font-black text-[#3f090d]">
                        {application.startup_name}
                      </h3>
                      <p className="mt-1 text-xs text-[#75645f]">
                        {application.applicant_name} ·{" "}
                        {application.applicant_email}
                      </p>
                      <p className="mt-2 text-[0.65rem] text-[#91817b]">
                        {application.sector ?? "Setor não informado"} ·{" "}
                        {stageLabel[application.stage] ?? application.stage}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={reviewStartupApplicationAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />
                        <input type="hidden" name="decision" value="reject" />
                        <button
                          className="min-h-10 rounded-xl border border-[#caa9a7] bg-white px-4 text-xs font-black text-[#8b171d]"
                          type="submit"
                        >
                          Recusar
                        </button>
                      </form>
                      <form
                        action={reviewStartupApplicationAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />
                        <input type="hidden" name="decision" value="approve" />
                        <button
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#751118] px-4 text-xs font-black text-white"
                          type="submit"
                        >
                          <UserCheck className="size-4" /> Aprovar
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-[#751118]/15 p-5 text-sm text-[#806f69]">
                Nenhuma solicitação aguardando análise.
              </p>
            )}
          </div>
        </article>

        <details
          className="dashboard-card group rounded-[1.7rem] p-5 sm:p-6"
          open
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                Entrada pela incubadora
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#3f090d]">
                Convidar startup
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#806f69]">
                Envie acesso ao representante e vincule uma turma opcionalmente.
              </p>
            </div>
            <UserPlus className="size-5 text-[#921a20]" />
          </summary>
          <form
            action={inviteStartupAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
          >
            <Field label="Startup já cadastrada (opcional)" name="startupId">
              <select
                className={inputClassName}
                name="startupId"
                defaultValue=""
              >
                <option value="">
                  Criar a startup quando o convite for aceito
                </option>
                {startups.map((startup) => (
                  <option key={startup.id} value={startup.id}>
                    {startup.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome da startup" name="startupName">
              <input className={inputClassName} name="startupName" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Representante" name="representativeName">
                <input
                  className={inputClassName}
                  name="representativeName"
                  required
                />
              </Field>
              <Field label="E-mail" name="email">
                <input
                  className={inputClassName}
                  name="email"
                  type="email"
                  required
                />
              </Field>
            </div>
            <Field label="Turma (opcional)" name="cohortId">
              <select
                className={inputClassName}
                name="cohortId"
                defaultValue=""
              >
                <option value="">Somente entrada na incubadora</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.programName} · {cohort.name}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Enviar convite</SubmitButton>
          </form>
          {invitations.length ? (
            <div className="mt-5 border-t border-[#751118]/8 pt-4">
              <p className="text-xs font-black text-[#5c0c12]">
                Convites recentes
              </p>
              <ul className="mt-3 space-y-2">
                {invitations.slice(0, 4).map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-[#6d5c58]">
                      {invitation.startupName} · {invitation.email}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#fbefe7] px-2 py-1 font-black text-[#751118]">
                      {invitation.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </details>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
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
                Poderá gerenciar a própria equipe quando a conta for vinculada.
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
                Crie uma turma no módulo Programas antes de matricular startups.
              </p>
            )}
            <SubmitButton>Vincular ou mover startup</SubmitButton>
          </form>
        </details>
      </section>

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
              Nenhuma startup cadastrada nesta incubadora.
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
                      {startup.city && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4 text-[#921a20]" />
                          {startup.city}
                          {startup.state ? `, ${startup.state}` : ""}
                        </span>
                      )}
                      <Link
                        href={`/o/${organizationSlug}/i/${incubatorSlug}/startups/${startup.id}`}
                        className="ml-auto font-black text-[#751118] hover:underline"
                      >
                        Abrir perfil →
                      </Link>
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
