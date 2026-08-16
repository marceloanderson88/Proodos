import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CalendarRange,
  CirclePause,
  CirclePlay,
  ExternalLink,
  Handshake,
  MailCheck,
  Network,
  Sparkles,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import {
  bookMentoringRoundSessionAction,
  createMentoringRoundAction,
  createMentorAssignmentAction,
  createMentorAvailabilityAction,
  createMentorProfileAction,
  createMentoringSessionAction,
  deleteMentorAvailabilityAction,
  inviteCohortMentorAction,
  respondCohortMentorInvitationAction,
  setMentoringRoundMentorAction,
  setMentoringRoundStatusAction,
  updateMentorAssignmentStatusAction,
  updateMentorProfileAction,
  updateMentorProfileStatusAction,
  updateMentoringSessionStatusAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/mentorias/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MentoringOperations } from "@/lib/mentoring/types";

type Mentor = {
  id: string;
  user_id: string;
  displayName: string;
  email: string;
  headline: string;
  bio: string;
  timezone: string;
  linkedin_url: string | null;
  status: "active" | "inactive";
  archived_at: string | null;
  created_at: string;
  skills: { kind: "specialty" | "segment"; name: string }[];
};

type Startup = {
  id: string;
  name: string;
  stage:
    "idea" | "validation" | "operation" | "traction" | "scale" | "graduated";
  status: "active" | "inactive" | "graduated" | "withdrawn" | "archived";
};

type Assignment = {
  id: string;
  mentor_profile_id: string;
  startup_id: string;
  status: "active" | "paused" | "ended";
  starts_on: string;
  ends_on: string | null;
  focus: string | null;
  created_at: string;
};

type Availability = {
  id: string;
  mentor_profile_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  timezone: string;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean;
};

type Session = {
  id: string;
  assignment_id: string;
  diagnostic_assessment_id: string | null;
  objective: string;
  round_id: string | null;
  mode: "remote" | "in_person" | "hybrid";
  timezone: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  meeting_url: string | null;
  location: string | null;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  cancellation_reason: string | null;
  created_at: string;
};

type Assessment = {
  id: string;
  startup_id: string;
  cycle_label: string;
  status:
    | "draft"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "validated"
    | "cancelled";
  evaluator_id: string | null;
  execution_mode: "self_assessment" | "facilitated";
};

const stageLabels: Record<Startup["stage"], string> = {
  idea: "Ideia",
  validation: "Validação",
  operation: "Operação",
  traction: "Tração",
  scale: "Escala",
  graduated: "Graduada",
};

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function MentoringWorkspace({
  view,
  organizationSlug,
  incubatorSlug,
  incubatorName,
  timezone,
  currentUserId,
  canManage,
  eligiblePeople,
  mentors,
  startups,
  assignments,
  availability,
  sessions,
  assessments,
  operations,
  success,
  error,
}: {
  view: "overview" | "mentores" | "equipe" | "rodadas" | "vinculos" | "agenda";
  organizationSlug: string;
  incubatorSlug: string;
  incubatorName: string;
  timezone: string;
  currentUserId: string;
  canManage: boolean;
  eligiblePeople: { userId: string; displayName: string; email: string }[];
  mentors: Mentor[];
  startups: Startup[];
  assignments: Assignment[];
  availability: Availability[];
  sessions: Session[];
  assessments: Assessment[];
  operations: MentoringOperations;
  success?: string;
  error?: string;
}) {
  const activeMentors = mentors.filter((mentor) => mentor.status === "active");
  const openAssignments = assignments.filter(
    (assignment) => assignment.status !== "ended",
  );
  const assignedStartupIds = new Set(
    openAssignments.map((assignment) => assignment.startup_id),
  );
  const specialtyCount = new Set(
    mentors.flatMap((mentor) =>
      mentor.skills
        .filter((skill) => skill.kind === "specialty")
        .map((skill) => skill.name.toLocaleLowerCase("pt-BR")),
    ),
  ).size;
  const managementUrl = `/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora`;
  const today = new Date().toISOString().slice(0, 10);
  const ownMentor = mentors.find((mentor) => mentor.user_id === currentUserId);
  const availabilityMentors = canManage
    ? activeMentors
    : ownMentor?.status === "active"
      ? [ownMentor]
      : [];
  const canManageAvailability = availabilityMentors.length > 0;
  const canRequestSession = openAssignments.length > 0;
  const canScheduleSessions = canManage || Boolean(ownMentor);
  const upcomingSessions = sessions.filter(
    (session) =>
      session.status === "requested" || session.status === "scheduled",
  );
  const activeRounds = operations.rounds.filter((round) =>
    ["open", "draft"].includes(round.status),
  );
  const ownTeamInvites = operations.cohortMentors.filter(
    (team) =>
      team.status === "invited" && team.mentor_profile_id === ownMentor?.id,
  );
  const pageCopy = {
    overview: {
      title: "Mentorias",
      description: `Acompanhe a rede de especialistas da ${incubatorName}, os vínculos ativos e a cobertura das startups.`,
    },
    mentores: {
      title: "Diretório de mentores",
      description:
        "Gerencie perfis, especialidades, setores de experiência e disponibilidade da rede.",
    },
    equipe: {
      title: "Equipe de mentores por turma",
      description:
        "Convide mentores, acompanhe o aceite e forme uma equipe coerente com cada turma do programa.",
    },
    rodadas: {
      title: "Rodadas de mentoria",
      description:
        "Abra períodos de reserva, selecione os mentores participantes e permita que startups agendem dentro da janela definida.",
    },
    vinculos: {
      title: "Vínculos de mentoria",
      description:
        "Conecte mentores e startups e acompanhe o ciclo de cada relacionamento.",
    },
    agenda: {
      title: "Agenda de mentorias",
      description:
        "Organize janelas de atendimento, solicitações e sessões agendadas.",
    },
  }[view];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#4f0710_0%,#76101d_62%,#8f1724_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(91,12,23,0.2)] sm:px-9 sm:py-10">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-extrabold tracking-[0.16em] uppercase">
              <Network className="size-3.5" /> Rede de especialistas
            </span>
            <h1 className="display-heading mt-5 text-4xl text-white sm:text-5xl">
              {pageCopy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">
              {pageCopy.description}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/10 px-5 py-4 text-sm text-white/80 backdrop-blur">
            <p className="font-extrabold text-white">Fundação ativa</p>
            <p className="mt-1">Perfis, especialidades e vínculos seguros.</p>
          </div>
        </div>
      </section>

      <FeedbackBanner success={success} error={error} />

      <section
        aria-label="Resumo das mentorias"
        className={`${view === "overview" ? "grid" : "hidden"} gap-4 sm:grid-cols-2 xl:grid-cols-5`}
      >
        {[
          [
            UsersRound,
            "Mentores ativos",
            activeMentors.length,
            "Pessoas com perfil publicado",
          ],
          [
            Handshake,
            "Vínculos em curso",
            openAssignments.length,
            "Ativos ou temporariamente pausados",
          ],
          [
            Sparkles,
            "Especialidades",
            specialtyCount,
            "Competências disponíveis na rede",
          ],
          [
            BriefcaseBusiness,
            "Startups sem mentor",
            Math.max(0, startups.length - assignedStartupIds.size),
            "Oportunidades de conexão",
          ],
          [
            CalendarRange,
            "Rodadas em preparação",
            activeRounds.length,
            "Abertas ou aguardando composição",
          ],
        ].map(([Icon, label, value, description]) => {
          const SummaryIcon = Icon as typeof UsersRound;
          return (
            <article key={String(label)} className="surface-card p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
                  <SummaryIcon className="size-5" />
                </span>
                <strong className="display-heading text-3xl text-[var(--text-strong)]">
                  {String(value)}
                </strong>
              </div>
              <p className="mt-4 text-sm font-extrabold text-[var(--text-strong)]">
                {String(label)}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {String(description)}
              </p>
            </article>
          );
        })}
      </section>

      <section
        className={`${view === "mentores" ? "grid" : "hidden"} gap-6 xl:grid-cols-[1.35fr_0.85fr]`}
      >
        <div className="surface-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Diretório da incubadora</p>
              <h2 className="operational-heading mt-1 text-2xl">
                Mentores disponíveis
              </h2>
            </div>
            <StatusBadge tone={activeMentors.length ? "success" : "neutral"}>
              {activeMentors.length} ativos
            </StatusBadge>
          </div>

          {mentors.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={UsersRound}
                title="Nenhum perfil de mentor"
                description="Atribua o papel Mentor a uma pessoa da incubadora e complete seu perfil profissional."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {mentors.map((mentor) => {
                const mentorAssignments = openAssignments.filter(
                  (assignment) => assignment.mentor_profile_id === mentor.id,
                );
                const specialties = mentor.skills.filter(
                  (skill) => skill.kind === "specialty",
                );
                const segments = mentor.skills.filter(
                  (skill) => skill.kind === "segment",
                );
                return (
                  <article
                    key={mentor.id}
                    className="rounded-3xl border border-[var(--border)] bg-white p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--wine-800)] text-sm font-black text-white">
                        {mentor.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-extrabold text-[var(--text-strong)]">
                            {mentor.displayName}
                          </h3>
                          <StatusBadge
                            tone={
                              mentor.status === "active" ? "success" : "neutral"
                            }
                          >
                            {mentor.status === "active" ? "Ativo" : "Inativo"}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-xs font-bold text-[var(--wine-700)]">
                          {mentor.headline}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--text-muted)]">
                      {mentor.bio}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {specialties.map((skill) => (
                        <span
                          key={`${mentor.id}-${skill.name}`}
                          className="rounded-full bg-[#f9e8e8] px-2.5 py-1 text-[0.68rem] font-extrabold text-[var(--wine-800)]"
                        >
                          {skill.name}
                        </span>
                      ))}
                      {segments.map((skill) => (
                        <span
                          key={`${mentor.id}-segment-${skill.name}`}
                          className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--text-muted)]"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs">
                      <span className="font-bold text-[var(--text-muted)]">
                        {mentorAssignments.length} startup(s) acompanhada(s)
                      </span>
                      {mentor.linkedin_url ? (
                        <a
                          href={mentor.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-extrabold text-[var(--wine-700)] hover:underline"
                        >
                          LinkedIn <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                    {canManage ? (
                      <details className="mt-4 border-t border-[var(--border)] pt-4">
                        <summary className="cursor-pointer text-xs font-extrabold text-[var(--wine-700)]">
                          Editar perfil e especialidades
                        </summary>
                        <form
                          action={updateMentorProfileAction.bind(
                            null,
                            organizationSlug,
                            incubatorSlug,
                          )}
                          className="mt-4 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="profileId"
                            value={mentor.id}
                          />
                          <input
                            type="hidden"
                            name="userId"
                            value={mentor.user_id}
                          />
                          <input
                            type="hidden"
                            name="timezone"
                            value={mentor.timezone}
                          />
                          <FormField
                            label="Título profissional"
                            htmlFor={`mentor-headline-${mentor.id}`}
                            required
                          >
                            <input
                              id={`mentor-headline-${mentor.id}`}
                              className={controlClassName}
                              name="headline"
                              defaultValue={mentor.headline}
                              maxLength={160}
                              required
                            />
                          </FormField>
                          <FormField
                            label="Biografia"
                            htmlFor={`mentor-bio-${mentor.id}`}
                            required
                          >
                            <textarea
                              id={`mentor-bio-${mentor.id}`}
                              className={`${controlClassName} min-h-24 resize-y`}
                              name="bio"
                              defaultValue={mentor.bio}
                              minLength={20}
                              maxLength={2000}
                              required
                            />
                          </FormField>
                          <FormField
                            label="Especialidades"
                            htmlFor={`mentor-specialties-${mentor.id}`}
                            required
                          >
                            <input
                              id={`mentor-specialties-${mentor.id}`}
                              className={controlClassName}
                              name="specialties"
                              defaultValue={specialties
                                .map((skill) => skill.name)
                                .join(", ")}
                              required
                            />
                          </FormField>
                          <FormField
                            label="Segmentos"
                            htmlFor={`mentor-segments-${mentor.id}`}
                          >
                            <input
                              id={`mentor-segments-${mentor.id}`}
                              className={controlClassName}
                              name="segments"
                              defaultValue={segments
                                .map((skill) => skill.name)
                                .join(", ")}
                            />
                          </FormField>
                          <FormField
                            label="LinkedIn"
                            htmlFor={`mentor-linkedin-${mentor.id}`}
                          >
                            <input
                              id={`mentor-linkedin-${mentor.id}`}
                              type="url"
                              className={controlClassName}
                              name="linkedinUrl"
                              defaultValue={mentor.linkedin_url ?? ""}
                            />
                          </FormField>
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" variant="secondary">
                              Salvar perfil
                            </Button>
                          </div>
                        </form>
                        <form
                          action={updateMentorProfileStatusAction.bind(
                            null,
                            organizationSlug,
                            incubatorSlug,
                          )}
                          className="mt-3"
                        >
                          <input
                            type="hidden"
                            name="profileId"
                            value={mentor.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              mentor.status === "active" ? "inactive" : "active"
                            }
                          />
                          {mentor.status === "active" ? (
                            <ConfirmSubmitButton
                              message={`Inativar o perfil de ${mentor.displayName}? Antes disso, todos os vínculos ativos precisam estar encerrados.`}
                            >
                              Inativar mentor
                            </ConfirmSubmitButton>
                          ) : (
                            <Button type="submit" variant="secondary">
                              Reativar mentor
                            </Button>
                          )}
                        </form>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          {canManage ? (
            <section className="surface-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
                  <UserRoundPlus className="size-5" />
                </span>
                <div>
                  <p className="eyebrow">Novo especialista</p>
                  <h2 className="operational-heading mt-1 text-xl">
                    Criar perfil de mentor
                  </h2>
                </div>
              </div>
              {eligiblePeople.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-sm leading-6 text-[var(--text-muted)]">
                  Não há pessoa com papel Mentor aguardando perfil. Convide ou
                  atribua o papel na gestão da incubadora.
                  <Link
                    href={managementUrl}
                    className="mt-3 inline-flex items-center gap-1 font-extrabold text-[var(--wine-700)]"
                  >
                    Gerenciar pessoas <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <form
                  action={createMentorProfileAction.bind(
                    null,
                    organizationSlug,
                    incubatorSlug,
                  )}
                  className="mt-5 space-y-4 border-t border-[var(--border)] pt-5"
                >
                  <FormField
                    label="Pessoa com papel Mentor"
                    htmlFor="mentor-user"
                    required
                  >
                    <select
                      id="mentor-user"
                      className={controlClassName}
                      name="userId"
                      required
                    >
                      <option value="">Selecione</option>
                      {eligiblePeople.map((person) => (
                        <option key={person.userId} value={person.userId}>
                          {person.displayName} · {person.email}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label="Título profissional"
                    htmlFor="mentor-headline"
                    required
                    hint="Ex.: Especialista em vendas B2B e go-to-market."
                  >
                    <input
                      id="mentor-headline"
                      className={controlClassName}
                      name="headline"
                      maxLength={160}
                      required
                    />
                  </FormField>
                  <FormField label="Biografia" htmlFor="mentor-bio" required>
                    <textarea
                      id="mentor-bio"
                      className={`${controlClassName} min-h-28 resize-y`}
                      name="bio"
                      minLength={20}
                      maxLength={2000}
                      required
                    />
                  </FormField>
                  <FormField
                    label="Especialidades"
                    htmlFor="mentor-specialties"
                    required
                    hint="Separe por vírgulas. Ex.: Produto, Finanças, Vendas B2B."
                  >
                    <input
                      id="mentor-specialties"
                      className={controlClassName}
                      name="specialties"
                      required
                    />
                  </FormField>
                  <FormField
                    label="Segmentos"
                    htmlFor="mentor-segments"
                    hint="Ex.: Agtech, SaaS, Economia criativa."
                  >
                    <input
                      id="mentor-segments"
                      className={controlClassName}
                      name="segments"
                    />
                  </FormField>
                  <FormField label="LinkedIn" htmlFor="mentor-linkedin">
                    <input
                      id="mentor-linkedin"
                      type="url"
                      className={controlClassName}
                      name="linkedinUrl"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </FormField>
                  <input type="hidden" name="timezone" value={timezone} />
                  <Button type="submit">Criar perfil</Button>
                </form>
              )}
            </section>
          ) : (
            <section className="surface-card p-6">
              <p className="eyebrow">Seu acesso</p>
              <h2 className="operational-heading mt-1 text-xl">
                Área do mentor
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                Você visualiza somente seu perfil e os vínculos autorizados. A
                consulte seus vínculos, solicite horários e acompanhe os
                registros compartilhados de cada sessão.
              </p>
            </section>
          )}
        </aside>
      </section>

      <section
        className={`${view === "equipe" ? "grid" : "hidden"} gap-6 xl:grid-cols-[0.82fr_1.18fr]`}
      >
        <div className="space-y-6">
          {canManage ? (
            <form
              action={inviteCohortMentorAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="surface-card space-y-4 p-5 sm:p-6"
            >
              <div>
                <p className="eyebrow">Composição da equipe</p>
                <h2 className="operational-heading mt-1 text-2xl">
                  Convidar para uma turma
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  O mentor recebe um aviso por e-mail e precisa aceitar antes de
                  participar das rodadas.
                </p>
              </div>
              <FormField label="Turma" htmlFor="team-cohort" required>
                <select
                  id="team-cohort"
                  name="cohortId"
                  className={controlClassName}
                  required
                >
                  <option value="">Selecione</option>
                  {operations.cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.programName} · {cohort.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Mentor" htmlFor="team-mentor" required>
                <select
                  id="team-mentor"
                  name="mentorProfileId"
                  className={controlClassName}
                  required
                >
                  <option value="">Selecione</option>
                  {activeMentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.displayName} · {mentor.headline}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button type="submit">
                <UserRoundPlus className="size-4" /> Enviar convite
              </Button>
            </form>
          ) : null}

          {ownTeamInvites.map((invite) => {
            const cohort = operations.cohorts.find(
              (item) => item.id === invite.cohort_id,
            );
            return (
              <article
                key={invite.id}
                className="rounded-3xl border border-[#d6a240]/45 bg-[#fff8e8] p-5"
              >
                <MailCheck className="size-7 text-[#9b6300]" />
                <p className="mt-4 text-xs font-black tracking-[0.14em] text-[#8a5900] uppercase">
                  Convite pendente
                </p>
                <h3 className="mt-1 text-xl font-black text-[var(--wine-950)]">
                  {cohort?.name ?? "Equipe da turma"}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {cohort?.programName}
                </p>
                <div className="mt-5 flex gap-2">
                  <form
                    action={respondCohortMentorInvitationAction.bind(
                      null,
                      organizationSlug,
                      incubatorSlug,
                    )}
                  >
                    <input type="hidden" name="teamId" value={invite.id} />
                    <input type="hidden" name="accept" value="true" />
                    <Button type="submit">Aceitar</Button>
                  </form>
                  <form
                    action={respondCohortMentorInvitationAction.bind(
                      null,
                      organizationSlug,
                      incubatorSlug,
                    )}
                  >
                    <input type="hidden" name="teamId" value={invite.id} />
                    <input type="hidden" name="accept" value="false" />
                    <Button type="submit" variant="secondary">
                      Recusar
                    </Button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>

        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Cobertura por turma</p>
              <h2 className="operational-heading mt-1 text-2xl">
                Equipes formadas
              </h2>
            </div>
            <StatusBadge tone="info">
              {
                operations.cohortMentors.filter(
                  (team) => team.status === "active",
                ).length
              }{" "}
              ativos
            </StatusBadge>
          </div>
          <div className="mt-5 space-y-3">
            {operations.cohortMentors.map((team) => {
              const cohort = operations.cohorts.find(
                (item) => item.id === team.cohort_id,
              );
              const mentor = mentors.find(
                (item) => item.id === team.mentor_profile_id,
              );
              return (
                <article
                  key={team.id}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[var(--wine-950)]">
                        {mentor?.displayName ?? "Mentor"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {cohort?.programName} · {cohort?.name}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        team.status === "active"
                          ? "success"
                          : team.status === "invited"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {team.status === "active"
                        ? "Aceito"
                        : team.status === "invited"
                          ? "Aguardando"
                          : team.status === "declined"
                            ? "Recusado"
                            : "Revogado"}
                    </StatusBadge>
                  </div>
                </article>
              );
            })}
            {!operations.cohortMentors.length ? (
              <EmptyState
                icon={UsersRound}
                title="Nenhuma equipe por turma"
                description="Convide os mentores que participarão das próximas rodadas."
              />
            ) : null}
          </div>
        </div>
      </section>

      <section
        className={`${view === "rodadas" ? "block" : "hidden"} space-y-6`}
      >
        {canManage ? (
          <form
            action={createMentoringRoundAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="surface-card p-5 sm:p-6"
          >
            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="eyebrow">Nova rodada</p>
                <h2 className="operational-heading mt-1 text-2xl">
                  Defina reservas e atendimentos
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  A janela de reserva controla quando a startup pode agendar; o
                  período de atendimento limita os horários das sessões.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Turma" htmlFor="round-cohort" required>
                  <select
                    id="round-cohort"
                    name="cohortId"
                    className={controlClassName}
                    required
                  >
                    <option value="">Selecione</option>
                    {operations.cohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.programName} · {cohort.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Nome" htmlFor="round-name" required>
                  <input
                    id="round-name"
                    name="name"
                    className={controlClassName}
                    placeholder="Rodada comercial — setembro"
                    required
                  />
                </FormField>
                <FormField
                  label="Reservas abrem"
                  htmlFor="booking-opens"
                  required
                >
                  <input
                    id="booking-opens"
                    name="bookingOpensAt"
                    type="datetime-local"
                    className={controlClassName}
                    required
                  />
                </FormField>
                <FormField
                  label="Reservas encerram"
                  htmlFor="booking-closes"
                  required
                >
                  <input
                    id="booking-closes"
                    name="bookingClosesAt"
                    type="datetime-local"
                    className={controlClassName}
                    required
                  />
                </FormField>
                <FormField
                  label="Atendimentos iniciam"
                  htmlFor="sessions-start"
                  required
                >
                  <input
                    id="sessions-start"
                    name="sessionsStartAt"
                    type="datetime-local"
                    className={controlClassName}
                    required
                  />
                </FormField>
                <FormField
                  label="Atendimentos encerram"
                  htmlFor="sessions-end"
                  required
                >
                  <input
                    id="sessions-end"
                    name="sessionsEndAt"
                    type="datetime-local"
                    className={controlClassName}
                    required
                  />
                </FormField>
                <FormField
                  label="Limite por startup"
                  htmlFor="round-limit"
                  required
                >
                  <input
                    id="round-limit"
                    name="maxSessions"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue="1"
                    className={controlClassName}
                    required
                  />
                </FormField>
                <FormField
                  label="Fuso horário"
                  htmlFor="round-timezone"
                  required
                >
                  <input
                    id="round-timezone"
                    name="timezone"
                    defaultValue={timezone}
                    className={controlClassName}
                    required
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Descrição" htmlFor="round-description">
                    <textarea
                      id="round-description"
                      name="description"
                      rows={3}
                      className={controlClassName}
                    />
                  </FormField>
                </div>
                <input type="hidden" name="openNow" value="false" />
                <div className="sm:col-span-2">
                  <Button type="submit">
                    <CalendarRange className="size-4" /> Criar como rascunho
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          {operations.rounds.map((round) => {
            const cohort = operations.cohorts.find(
              (item) => item.id === round.cohort_id,
            );
            const eligibleTeam = operations.cohortMentors.filter(
              (team) =>
                team.cohort_id === round.cohort_id && team.status === "active",
            );
            const selectedTeamIds = new Set(
              operations.roundMentors
                .filter((item) => item.round_id === round.id)
                .map((item) => item.cohort_mentor_id),
            );
            const roundAssignments = openAssignments.filter(
              (assignment) =>
                assignment.status === "active" &&
                eligibleTeam.some(
                  (team) =>
                    team.mentor_profile_id === assignment.mentor_profile_id &&
                    selectedTeamIds.has(team.id),
                ),
            );
            return (
              <article key={round.id} className="surface-card overflow-hidden">
                <div className="border-b border-[var(--border)] bg-[#fffaf6] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{cohort?.programName}</p>
                      <h3 className="mt-1 text-xl font-black text-[var(--wine-950)]">
                        {round.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {cohort?.name}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        round.status === "open"
                          ? "success"
                          : round.status === "draft"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {round.status === "open"
                        ? "Reservas abertas"
                        : round.status === "draft"
                          ? "Rascunho"
                          : round.status === "closed"
                            ? "Encerrada"
                            : round.status === "completed"
                              ? "Concluída"
                              : "Cancelada"}
                    </StatusBadge>
                  </div>
                  <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-3">
                      <p className="font-black text-[var(--text-strong)]">
                        Reservas
                      </p>
                      <p className="mt-1 text-[var(--text-muted)]">
                        {formatDateTime(round.booking_opens_at, round.timezone)}{" "}
                        →{" "}
                        {formatDateTime(
                          round.booking_closes_at,
                          round.timezone,
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="font-black text-[var(--text-strong)]">
                        Atendimentos
                      </p>
                      <p className="mt-1 text-[var(--text-muted)]">
                        {formatDateTime(
                          round.sessions_start_at,
                          round.timezone,
                        )}{" "}
                        →{" "}
                        {formatDateTime(round.sessions_end_at, round.timezone)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                  {canManage ? (
                    <div>
                      <p className="text-xs font-black tracking-[0.12em] text-[var(--text-muted)] uppercase">
                        Mentores participantes
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {eligibleTeam.map((team) => {
                          const mentor = mentors.find(
                            (item) => item.id === team.mentor_profile_id,
                          );
                          const selected = selectedTeamIds.has(team.id);
                          return (
                            <form
                              key={team.id}
                              action={setMentoringRoundMentorAction.bind(
                                null,
                                organizationSlug,
                                incubatorSlug,
                              )}
                            >
                              <input
                                type="hidden"
                                name="roundId"
                                value={round.id}
                              />
                              <input
                                type="hidden"
                                name="cohortMentorId"
                                value={team.id}
                              />
                              <input
                                type="hidden"
                                name="enabled"
                                value={selected ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className={`rounded-full border px-3 py-2 text-xs font-extrabold ${selected ? "border-[#1f7a57]/25 bg-[#e9f6ef] text-[#176044]" : "border-[var(--border)] bg-white text-[var(--text-muted)]"}`}
                              >
                                {selected ? "✓ " : "+ "}
                                {mentor?.displayName ?? "Mentor"}
                              </button>
                            </form>
                          );
                        })}
                        {!eligibleTeam.length ? (
                          <p className="text-xs text-[var(--text-muted)]">
                            Nenhum mentor aceitou o convite desta turma.
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {round.status === "draft" ? (
                          <form
                            action={setMentoringRoundStatusAction.bind(
                              null,
                              organizationSlug,
                              incubatorSlug,
                            )}
                          >
                            <input
                              type="hidden"
                              name="roundId"
                              value={round.id}
                            />
                            <input type="hidden" name="status" value="open" />
                            <Button type="submit">Abrir reservas</Button>
                          </form>
                        ) : null}
                        {round.status === "open" ? (
                          <form
                            action={setMentoringRoundStatusAction.bind(
                              null,
                              organizationSlug,
                              incubatorSlug,
                            )}
                          >
                            <input
                              type="hidden"
                              name="roundId"
                              value={round.id}
                            />
                            <input type="hidden" name="status" value="closed" />
                            <Button type="submit" variant="secondary">
                              Encerrar reservas
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {round.status === "open" && roundAssignments.length ? (
                    <form
                      action={bookMentoringRoundSessionAction.bind(
                        null,
                        organizationSlug,
                        incubatorSlug,
                      )}
                      className="space-y-3 rounded-2xl border border-[#8d1018]/15 bg-[#fff8f4] p-4"
                    >
                      <p className="font-black text-[var(--wine-950)]">
                        Agendar nesta rodada
                      </p>
                      <input type="hidden" name="roundId" value={round.id} />
                      <input
                        type="hidden"
                        name="timezone"
                        value={round.timezone}
                      />
                      <select
                        name="assignmentId"
                        className={controlClassName}
                        required
                      >
                        <option value="">Mentor e startup</option>
                        {roundAssignments.map((assignment) => {
                          const mentor = mentors.find(
                            (item) => item.id === assignment.mentor_profile_id,
                          );
                          const startup = startups.find(
                            (item) => item.id === assignment.startup_id,
                          );
                          return (
                            <option key={assignment.id} value={assignment.id}>
                              {mentor?.displayName} · {startup?.name}
                            </option>
                          );
                        })}
                      </select>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          name="scheduledStartAt"
                          type="datetime-local"
                          className={controlClassName}
                          required
                        />
                        <input
                          name="scheduledEndAt"
                          type="datetime-local"
                          className={controlClassName}
                          required
                        />
                      </div>
                      <textarea
                        name="objective"
                        rows={3}
                        className={controlClassName}
                        placeholder="Objetivo da mentoria"
                        required
                      />
                      <select
                        name="mode"
                        className={controlClassName}
                        defaultValue="remote"
                      >
                        <option value="remote">Remota</option>
                        <option value="in_person">Presencial</option>
                        <option value="hybrid">Híbrida</option>
                      </select>
                      <input
                        name="meetingUrl"
                        type="url"
                        className={controlClassName}
                        placeholder="Link da reunião (opcional)"
                      />
                      <input
                        name="location"
                        className={controlClassName}
                        placeholder="Local (opcional)"
                      />
                      <Button type="submit">
                        <CalendarClock className="size-4" /> Confirmar horário
                      </Button>
                    </form>
                  ) : round.status === "open" ? (
                    <p className="rounded-2xl bg-[#f7f2ee] p-4 text-sm text-[var(--text-muted)]">
                      Nenhum vínculo elegível com os mentores desta rodada.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!operations.rounds.length ? (
            <EmptyState
              icon={CalendarRange}
              title="Nenhuma rodada criada"
              description="Crie uma rodada vinculada a uma turma e convide os mentores participantes."
            />
          ) : null}
        </div>
      </section>

      <section
        className={`${view === "vinculos" ? "block" : "hidden"} surface-card p-5 sm:p-6`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Acompanhamento</p>
            <h2 className="operational-heading mt-1 text-2xl">
              Mentor e startup
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              O vínculo define quem poderá agendar sessões e consultar o
              histórico compartilhado.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-extrabold text-[var(--wine-800)]">
            <CalendarClock className="size-4" /> Agenda e sessões operacionais
          </span>
        </div>

        {canManage ? (
          <form
            action={createMentorAssignmentAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-6 grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5 md:grid-cols-2 xl:grid-cols-5"
          >
            <FormField label="Mentor" htmlFor="assignment-mentor" required>
              <select
                id="assignment-mentor"
                className={controlClassName}
                name="mentorProfileId"
                required
              >
                <option value="">Selecione</option>
                {activeMentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.displayName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Startup" htmlFor="assignment-startup" required>
              <select
                id="assignment-startup"
                className={controlClassName}
                name="startupId"
                required
              >
                <option value="">Selecione</option>
                {startups.map((startup) => (
                  <option key={startup.id} value={startup.id}>
                    {startup.name} · {stageLabels[startup.stage]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Início" htmlFor="assignment-start" required>
              <input
                id="assignment-start"
                type="date"
                className={controlClassName}
                name="startsOn"
                defaultValue={today}
                required
              />
            </FormField>
            <FormField label="Fim previsto" htmlFor="assignment-end">
              <input
                id="assignment-end"
                type="date"
                className={controlClassName}
                name="endsOn"
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={!activeMentors.length || !startups.length}
              >
                Criar vínculo
              </Button>
            </div>
            <FormField
              className="md:col-span-2 xl:col-span-5"
              label="Foco do acompanhamento"
              htmlFor="assignment-focus"
              hint="Contexto compartilhado com mentor e startup."
            >
              <textarea
                id="assignment-focus"
                className={`${controlClassName} min-h-20 resize-y`}
                name="focus"
                maxLength={1000}
              />
            </FormField>
          </form>
        ) : null}

        {assignments.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Handshake}
              title="Nenhum vínculo de mentoria"
              description="Conecte um mentor ativo a uma startup para iniciar o acompanhamento."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-xs tracking-[0.08em] text-[var(--text-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">Mentor</th>
                  <th className="px-4 py-3">Startup</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Foco</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage ? (
                    <th className="px-4 py-3 text-right">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {assignments.map((assignment) => {
                  const mentor = mentors.find(
                    (item) => item.id === assignment.mentor_profile_id,
                  );
                  const startup = startups.find(
                    (item) => item.id === assignment.startup_id,
                  );
                  return (
                    <tr key={assignment.id}>
                      <td className="px-4 py-4 font-extrabold text-[var(--text-strong)]">
                        {mentor?.displayName ?? "Mentor indisponível"}
                      </td>
                      <td className="px-4 py-4 font-bold">
                        {startup?.name ?? "Startup indisponível"}
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap text-[var(--text-muted)]">
                        {formatDate(assignment.starts_on)}
                        {assignment.ends_on
                          ? ` — ${formatDate(assignment.ends_on)}`
                          : " — contínuo"}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-xs leading-5 text-[var(--text-muted)]">
                        {assignment.focus ?? "Foco ainda não definido"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          tone={
                            assignment.status === "active"
                              ? "success"
                              : assignment.status === "paused"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {assignment.status === "active"
                            ? "Ativo"
                            : assignment.status === "paused"
                              ? "Pausado"
                              : "Encerrado"}
                        </StatusBadge>
                      </td>
                      {canManage ? (
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {assignment.status === "active" ? (
                              <form
                                action={updateMentorAssignmentStatusAction.bind(
                                  null,
                                  organizationSlug,
                                  incubatorSlug,
                                )}
                              >
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="pause"
                                />
                                <Button
                                  type="submit"
                                  variant="secondary"
                                  className="px-3"
                                >
                                  <CirclePause className="size-4" /> Pausar
                                </Button>
                              </form>
                            ) : assignment.status === "paused" ? (
                              <form
                                action={updateMentorAssignmentStatusAction.bind(
                                  null,
                                  organizationSlug,
                                  incubatorSlug,
                                )}
                              >
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="resume"
                                />
                                <Button
                                  type="submit"
                                  variant="secondary"
                                  className="px-3"
                                >
                                  <CirclePlay className="size-4" /> Retomar
                                </Button>
                              </form>
                            ) : null}
                            {assignment.status !== "ended" ? (
                              <form
                                action={updateMentorAssignmentStatusAction.bind(
                                  null,
                                  organizationSlug,
                                  incubatorSlug,
                                )}
                              >
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="end"
                                />
                                <ConfirmSubmitButton
                                  message={`Encerrar o acompanhamento de ${mentor?.displayName ?? "mentor"} com ${startup?.name ?? "startup"}?`}
                                >
                                  Encerrar
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className={`${view === "agenda" ? "grid" : "hidden"} gap-6 xl:grid-cols-[0.9fr_1.1fr]`}
      >
        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Disponibilidade</p>
              <h2 className="operational-heading mt-1 text-2xl">
                Janelas de atendimento
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Horários recorrentes usados como referência para novas
                solicitações.
              </p>
            </div>
            <CalendarClock className="size-5 text-[var(--wine-700)]" />
          </div>
          {canManageAvailability ? (
            <form
              action={createMentorAvailabilityAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2"
            >
              <FormField label="Mentor" htmlFor="availability-mentor" required>
                <select
                  id="availability-mentor"
                  name="mentorProfileId"
                  className={controlClassName}
                  required
                >
                  <option value="">Selecione</option>
                  {availabilityMentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.displayName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Dia" htmlFor="availability-weekday" required>
                <select
                  id="availability-weekday"
                  name="weekday"
                  className={controlClassName}
                  defaultValue="1"
                  required
                >
                  {weekdayLabels.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Início" htmlFor="availability-start" required>
                <input
                  id="availability-start"
                  name="startsAt"
                  type="time"
                  className={controlClassName}
                  required
                />
              </FormField>
              <FormField label="Fim" htmlFor="availability-end" required>
                <input
                  id="availability-end"
                  name="endsAt"
                  type="time"
                  className={controlClassName}
                  required
                />
              </FormField>
              <FormField
                label="Válido a partir de"
                htmlFor="availability-from"
                required
              >
                <input
                  id="availability-from"
                  name="effectiveFrom"
                  type="date"
                  defaultValue={today}
                  className={controlClassName}
                  required
                />
              </FormField>
              <FormField label="Válido até" htmlFor="availability-until">
                <input
                  id="availability-until"
                  name="effectiveUntil"
                  type="date"
                  className={controlClassName}
                />
              </FormField>
              <input type="hidden" name="timezone" value={timezone} />
              <Button type="submit" className="sm:col-span-2">
                Adicionar janela
              </Button>
            </form>
          ) : null}
          <div className="mt-5 space-y-2">
            {availability.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                Nenhuma janela cadastrada.
              </p>
            ) : (
              availability.map((slot) => {
                const mentor = mentors.find(
                  (item) => item.id === slot.mentor_profile_id,
                );
                const canDeleteSlot =
                  canManage || slot.mentor_profile_id === ownMentor?.id;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-extrabold text-[var(--text-strong)]">
                        {mentor?.displayName ?? "Mentor"} ·{" "}
                        {weekdayLabels[slot.weekday]}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}{" "}
                        · {slot.timezone}
                      </p>
                    </div>
                    {canDeleteSlot ? (
                      <form
                        action={deleteMentorAvailabilityAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="availabilityId"
                          value={slot.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          className="px-2 text-[var(--wine-700)]"
                          aria-label={`Remover disponibilidade de ${mentor?.displayName ?? "mentor"}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="surface-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Agenda operacional</p>
              <h2 className="operational-heading mt-1 text-2xl">
                Solicitações e sessões
              </h2>
            </div>
            <StatusBadge tone={upcomingSessions.length ? "warning" : "neutral"}>
              {upcomingSessions.length} em aberto
            </StatusBadge>
          </div>
          {canRequestSession ? (
            <form
              action={createMentoringSessionAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2"
            >
              <FormField label="Vínculo" htmlFor="session-assignment" required>
                <select
                  id="session-assignment"
                  name="assignmentId"
                  className={controlClassName}
                  required
                >
                  <option value="">Selecione</option>
                  {openAssignments.map((assignment) => {
                    const mentor = mentors.find(
                      (item) => item.id === assignment.mentor_profile_id,
                    );
                    const startup = startups.find(
                      (item) => item.id === assignment.startup_id,
                    );
                    return (
                      <option key={assignment.id} value={assignment.id}>
                        {mentor?.displayName ?? "Mentor"} ·{" "}
                        {startup?.name ?? "Startup"}
                      </option>
                    );
                  })}
                </select>
              </FormField>
              <FormField label="Modalidade" htmlFor="session-mode" required>
                <select
                  id="session-mode"
                  name="mode"
                  className={controlClassName}
                  defaultValue="remote"
                  required
                >
                  <option value="remote">Remota</option>
                  <option value="in_person">Presencial</option>
                  <option value="hybrid">Híbrida</option>
                </select>
              </FormField>
              <FormField
                label="Diagnóstico facilitado"
                htmlFor="session-assessment"
              >
                <select
                  id="session-assessment"
                  name="diagnosticAssessmentId"
                  className={controlClassName}
                >
                  <option value="">Nenhum</option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.cycle_label} · {assessment.status}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Objetivo"
                htmlFor="session-objective"
                required
                className="sm:col-span-2"
              >
                <textarea
                  id="session-objective"
                  name="objective"
                  className={`${controlClassName} min-h-20`}
                  placeholder="O que precisa ser resolvido nesta conversa?"
                  required
                />
              </FormField>
              <FormField label="Início (opcional)" htmlFor="session-start">
                <input
                  id="session-start"
                  name="scheduledStartAt"
                  type="datetime-local"
                  className={controlClassName}
                />
              </FormField>
              <FormField label="Fim (opcional)" htmlFor="session-end">
                <input
                  id="session-end"
                  name="scheduledEndAt"
                  type="datetime-local"
                  className={controlClassName}
                />
              </FormField>
              <FormField label="Link da reunião" htmlFor="session-meeting-url">
                <input
                  id="session-meeting-url"
                  name="meetingUrl"
                  type="url"
                  className={controlClassName}
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="Local" htmlFor="session-location">
                <input
                  id="session-location"
                  name="location"
                  className={controlClassName}
                  placeholder="Sala ou endereço"
                />
              </FormField>
              <input type="hidden" name="timezone" value={timezone} />
              <Button type="submit" className="sm:col-span-2">
                {canScheduleSessions ? "Agendar sessão" : "Solicitar sessão"}
              </Button>
            </form>
          ) : null}
          <div className="mt-5 space-y-3">
            {sessions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                Nenhuma sessão registrada.
              </p>
            ) : (
              sessions.slice(0, 8).map((session) => {
                const assignment = assignments.find(
                  (item) => item.id === session.assignment_id,
                );
                const mentor = mentors.find(
                  (item) => item.id === assignment?.mentor_profile_id,
                );
                const startup = startups.find(
                  (item) => item.id === assignment?.startup_id,
                );
                return (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-[var(--border)] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold tracking-[0.08em] text-[var(--wine-700)] uppercase">
                          {mentor?.displayName ?? "Mentor"} ·{" "}
                          {startup?.name ?? "Startup"}
                        </p>
                        <h3 className="mt-1 font-extrabold text-[var(--text-strong)]">
                          {session.objective}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {session.scheduled_start_at
                            ? formatDateTime(
                                session.scheduled_start_at,
                                session.timezone,
                              )
                            : "Aguardando agendamento"}
                        </p>
                      </div>
                      <StatusBadge
                        tone={
                          session.status === "completed"
                            ? "success"
                            : session.status === "cancelled"
                              ? "neutral"
                              : session.status === "requested"
                                ? "warning"
                                : "info"
                        }
                      >
                        {session.status === "requested"
                          ? "Solicitada"
                          : session.status === "scheduled"
                            ? "Agendada"
                            : session.status === "completed"
                              ? "Concluída"
                              : "Cancelada"}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/o/${organizationSlug}/i/${incubatorSlug}/mentorias/sessoes/${session.id}`}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--wine-700)] hover:underline"
                      >
                        Abrir sessão <ArrowRight className="size-3.5" />
                      </Link>
                      {canManage &&
                      session.status === "requested" &&
                      session.scheduled_start_at ? (
                        <form
                          action={updateMentoringSessionStatusAction.bind(
                            null,
                            organizationSlug,
                            incubatorSlug,
                          )}
                        >
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="scheduled"
                          />
                          <input type="hidden" name="reason" value="" />
                          <Button
                            type="submit"
                            variant="secondary"
                            className="px-3"
                          >
                            Confirmar
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
