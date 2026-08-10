import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  Video,
} from "lucide-react";

import {
  createMentoringFeedbackAction,
  createMentoringNoteAction,
  createMentoringRecommendationAction,
  rescheduleMentoringSessionAction,
  updateMentoringRecommendationAction,
  updateMentoringSessionStatusAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/mentorias/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { Button } from "@/components/ui/button";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";

type Session = {
  id: string;
  objective: string;
  mode: "remote" | "in_person" | "hybrid";
  timezone: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  meeting_url: string | null;
  location: string | null;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  cancellation_reason: string | null;
};

type Note = {
  id: string;
  visibility: "shared" | "restricted";
  content: string;
  created_at: string;
};

type Recommendation = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "proposed" | "accepted" | "dismissed" | "converted";
  due_on: string | null;
  created_by: string;
};

type Feedback = {
  id: string;
  author_user_id: string;
  kind: "mentor_to_startup" | "startup_to_mentor";
  rating: number;
  strengths: string;
  improvements: string;
  is_shared: boolean;
};

const statusLabels: Record<Session["status"], string> = {
  requested: "Solicitada",
  scheduled: "Agendada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const modeLabels: Record<Session["mode"], string> = {
  remote: "Remota",
  in_person: "Presencial",
  hybrid: "Híbrida",
};

const recommendationStatusLabels: Record<Recommendation["status"], string> = {
  proposed: "Proposta",
  accepted: "Aceita",
  dismissed: "Descartada",
  converted: "Convertida",
};

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function toDateTimeLocal(value: string | null, timeZone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function MentoringSessionDetail({
  organizationSlug,
  incubatorSlug,
  timezone,
  startupName,
  session,
  notes,
  recommendations,
  feedback,
  canSchedule,
  canRecord,
  canManage,
  canFeedback,
  hasSubmittedFeedback,
  currentUserId,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  timezone: string;
  startupName: string;
  session: Session;
  notes: Note[];
  recommendations: Recommendation[];
  feedback: Feedback[];
  canSchedule: boolean;
  canRecord: boolean;
  canManage: boolean;
  canFeedback: boolean;
  hasSubmittedFeedback: boolean;
  currentUserId: string;
  success?: string;
  error?: string;
}) {
  const isOpen =
    session.status === "requested" || session.status === "scheduled";
  const canComplete = canSchedule && session.status === "scheduled";
  const statusTone =
    session.status === "completed"
      ? "success"
      : session.status === "cancelled"
        ? "neutral"
        : session.status === "requested"
          ? "warning"
          : "info";

  return (
    <div className="space-y-6">
      <Link
        href={`/o/${organizationSlug}/i/${incubatorSlug}/mentorias`}
        className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--wine-700)] hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar para mentorias
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#4f0710_0%,#76101d_62%,#8f1724_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(91,12,23,0.2)] sm:px-9">
        <div className="absolute -top-20 -right-20 size-64 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-extrabold tracking-[0.16em] text-white/65 uppercase">
              Sessão com {startupName}
            </p>
            <h1 className="display-heading mt-3 text-3xl text-white sm:text-4xl">
              {session.objective}
            </h1>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="size-4" />
                {session.scheduled_start_at
                  ? formatDateTime(session.scheduled_start_at, session.timezone)
                  : "Horário ainda não definido"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Video className="size-4" /> {modeLabels[session.mode]}
              </span>
            </div>
          </div>
          <StatusBadge tone={statusTone}>
            {statusLabels[session.status]}
          </StatusBadge>
        </div>
      </section>

      <FeedbackBanner success={success} error={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface-card p-5">
          <p className="eyebrow">Situação</p>
          <p className="mt-2 font-extrabold text-[var(--text-strong)]">
            {statusLabels[session.status]}
          </p>
        </article>
        <article className="surface-card p-5">
          <p className="eyebrow">Modalidade</p>
          <p className="mt-2 font-extrabold text-[var(--text-strong)]">
            {modeLabels[session.mode]}
          </p>
        </article>
        <article className="surface-card p-5 sm:col-span-2">
          <p className="eyebrow">Acesso</p>
          {session.meeting_url ? (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 font-extrabold text-[var(--wine-700)] hover:underline"
            >
              Abrir sala da reunião <ExternalLink className="size-4" />
            </a>
          ) : session.location ? (
            <p className="mt-2 inline-flex items-center gap-2 font-bold text-[var(--text-strong)]">
              <MapPin className="size-4 text-[var(--wine-700)]" />{" "}
              {session.location}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Link ou local ainda não informado.
            </p>
          )}
        </article>
      </section>

      {session.status === "cancelled" && session.cancellation_reason ? (
        <section className="rounded-3xl border border-[#e7c4c7] bg-[#fff4f4] p-5">
          <p className="eyebrow text-[#98212a]">Motivo do cancelamento</p>
          <p className="mt-2 text-sm leading-6 text-[#6f3035]">
            {session.cancellation_reason}
          </p>
        </section>
      ) : null}

      {canSchedule && isOpen ? (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 className="operational-heading mt-1 text-xl">
                {session.scheduled_start_at
                  ? "Reagendar sessão"
                  : "Definir horário"}
              </h2>
            </div>
          </div>
          <form
            action={rescheduleMentoringSessionAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-5 grid gap-3 sm:grid-cols-3"
          >
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="timezone" value={timezone} />
            <FormField label="Início" htmlFor="detail-start" required>
              <input
                id="detail-start"
                name="scheduledStartAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(
                  session.scheduled_start_at,
                  session.timezone,
                )}
                className={controlClassName}
                required
              />
            </FormField>
            <FormField label="Fim" htmlFor="detail-end" required>
              <input
                id="detail-end"
                name="scheduledEndAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(
                  session.scheduled_end_at,
                  session.timezone,
                )}
                className={controlClassName}
                required
              />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                {session.scheduled_start_at
                  ? "Salvar novo horário"
                  : "Agendar sessão"}
              </Button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {session.status === "requested" && session.scheduled_start_at ? (
              <form
                action={updateMentoringSessionStatusAction.bind(
                  null,
                  organizationSlug,
                  incubatorSlug,
                )}
              >
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="status" value="scheduled" />
                <input type="hidden" name="reason" value="" />
                <Button type="submit" variant="secondary">
                  Confirmar horário proposto
                </Button>
              </form>
            ) : null}
            {canComplete ? (
              <form
                action={updateMentoringSessionStatusAction.bind(
                  null,
                  organizationSlug,
                  incubatorSlug,
                )}
              >
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="status" value="completed" />
                <input type="hidden" name="reason" value="" />
                <Button type="submit" variant="secondary">
                  <CheckCircle2 className="size-4" /> Concluir sessão
                </Button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      {canSchedule && isOpen ? (
        <details className="surface-card p-5 sm:p-6">
          <summary className="cursor-pointer font-extrabold text-[#98212a]">
            Cancelar esta sessão
          </summary>
          <form
            action={updateMentoringSessionStatusAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value="cancelled" />
            <FormField
              label="Motivo do cancelamento"
              htmlFor="cancel-reason"
              required
              className="flex-1"
            >
              <input
                id="cancel-reason"
                name="reason"
                className={controlClassName}
                minLength={3}
                maxLength={1000}
                required
              />
            </FormField>
            <Button type="submit" variant="secondary">
              Confirmar cancelamento
            </Button>
          </form>
        </details>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="size-5 text-[var(--wine-700)]" />
            <div>
              <p className="eyebrow">Memória da sessão</p>
              <h2 className="operational-heading mt-1 text-xl">
                Registros e decisões
              </h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {notes.map((note) => (
              <article
                key={note.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
              >
                <div className="flex justify-between gap-3">
                  <StatusBadge
                    tone={note.visibility === "shared" ? "success" : "warning"}
                  >
                    {note.visibility === "shared"
                      ? "Compartilhado"
                      : "Restrito"}
                  </StatusBadge>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(note.created_at),
                    )}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[var(--text-muted)]">
                  {note.content}
                </p>
              </article>
            ))}
            {notes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                Nenhum registro realizado.
              </p>
            ) : null}
          </div>
          {canRecord ? (
            <form
              action={createMentoringNoteAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-3 border-t border-[var(--border)] pt-5"
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <FormField
                label="Novo registro"
                htmlFor="note-content"
                required
                hint="Registre resumo, decisões e encaminhamentos."
              >
                <textarea
                  id="note-content"
                  name="content"
                  className={`${controlClassName} min-h-28`}
                  maxLength={5000}
                  required
                />
              </FormField>
              <FormField label="Visibilidade" htmlFor="note-visibility">
                <select
                  id="note-visibility"
                  name="visibility"
                  className={controlClassName}
                  defaultValue="shared"
                >
                  <option value="shared">Compartilhar com a startup</option>
                  <option value="restricted">
                    Restrito à equipe autorizada
                  </option>
                </select>
              </FormField>
              <Button type="submit">Salvar registro</Button>
            </form>
          ) : null}
        </div>

        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-[var(--wine-700)]" />
            <div>
              <p className="eyebrow">Próximos passos</p>
              <h2 className="operational-heading mt-1 text-xl">
                Recomendações
              </h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {recommendations.map((recommendation) => {
              const canUpdate =
                canManage || recommendation.created_by === currentUserId;
              return (
                <article
                  key={recommendation.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-[var(--text-strong)]">
                        {recommendation.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        {recommendation.description}
                      </p>
                      {recommendation.due_on ? (
                        <p className="mt-2 text-xs font-bold text-[var(--text-muted)]">
                          Prazo: {formatDate(recommendation.due_on)}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      tone={
                        recommendation.status === "accepted"
                          ? "success"
                          : recommendation.status === "dismissed"
                            ? "neutral"
                            : recommendation.priority === "critical"
                              ? "danger"
                              : "warning"
                      }
                    >
                      {recommendationStatusLabels[recommendation.status]}
                    </StatusBadge>
                  </div>
                  {canUpdate && recommendation.status === "proposed" ? (
                    <div className="mt-3 flex gap-2">
                      <form
                        action={updateMentoringRecommendationAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="recommendationId"
                          value={recommendation.id}
                        />
                        <input type="hidden" name="status" value="accepted" />
                        <Button
                          type="submit"
                          variant="secondary"
                          className="px-3"
                        >
                          Aceitar
                        </Button>
                      </form>
                      <form
                        action={updateMentoringRecommendationAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="recommendationId"
                          value={recommendation.id}
                        />
                        <input type="hidden" name="status" value="dismissed" />
                        <Button type="submit" variant="ghost" className="px-3">
                          Descartar
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {recommendations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                Nenhuma recomendação registrada.
              </p>
            ) : null}
          </div>
          {canRecord ? (
            <form
              action={createMentoringRecommendationAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 space-y-3 border-t border-[var(--border)] pt-5"
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <FormField label="Título" htmlFor="recommendation-title" required>
                <input
                  id="recommendation-title"
                  name="title"
                  className={controlClassName}
                  maxLength={180}
                  required
                />
              </FormField>
              <FormField
                label="Descrição"
                htmlFor="recommendation-description"
                required
              >
                <textarea
                  id="recommendation-description"
                  name="description"
                  className={`${controlClassName} min-h-24`}
                  maxLength={3000}
                  required
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Prioridade" htmlFor="recommendation-priority">
                  <select
                    id="recommendation-priority"
                    name="priority"
                    className={controlClassName}
                    defaultValue="medium"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </FormField>
                <FormField label="Prazo" htmlFor="recommendation-due-on">
                  <input
                    id="recommendation-due-on"
                    name="dueOn"
                    type="date"
                    className={controlClassName}
                  />
                </FormField>
              </div>
              <Button type="submit">Registrar recomendação</Button>
            </form>
          ) : null}
        </div>
      </section>

      {session.status === "completed" ? (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#fff1d8] text-[#87500e]">
              <ClipboardCheck className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Encerramento</p>
              <h2 className="operational-heading mt-1 text-xl">
                Feedback da sessão
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                A direção da avaliação é definida automaticamente pelo seu
                vínculo.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {feedback.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold text-[var(--text-strong)]">
                    {item.kind === "mentor_to_startup"
                      ? "Mentor para startup"
                      : "Startup para mentor"}
                  </p>
                  <span className="inline-flex items-center gap-1 font-extrabold text-[#9b6710]">
                    <Star className="size-4 fill-current" /> {item.rating}/5
                  </span>
                </div>
                <p className="mt-3 leading-6 text-[var(--text-muted)]">
                  {item.strengths}
                </p>
                <p className="mt-2 leading-6 text-[var(--text-muted)]">
                  <strong>Desenvolver:</strong> {item.improvements}
                </p>
                {!item.is_shared ? (
                  <StatusBadge tone="warning" className="mt-3">
                    Avaliação restrita
                  </StatusBadge>
                ) : null}
              </article>
            ))}
          </div>
          {canFeedback && !hasSubmittedFeedback ? (
            <form
              action={createMentoringFeedbackAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2"
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <FormField label="Avaliação geral" htmlFor="feedback-rating">
                <select
                  id="feedback-rating"
                  name="rating"
                  className={controlClassName}
                  defaultValue="5"
                >
                  <option value="5">5 — Excelente</option>
                  <option value="4">4 — Muito bom</option>
                  <option value="3">3 — Adequado</option>
                  <option value="2">2 — Precisa melhorar</option>
                  <option value="1">1 — Insuficiente</option>
                </select>
              </FormField>
              <div />
              <FormField
                label="Pontos fortes"
                htmlFor="feedback-strengths"
                required
                className="sm:col-span-2"
              >
                <textarea
                  id="feedback-strengths"
                  name="strengths"
                  className={`${controlClassName} min-h-20`}
                  maxLength={2000}
                  required
                />
              </FormField>
              <FormField
                label="Pontos a desenvolver"
                htmlFor="feedback-improvements"
                required
                className="sm:col-span-2"
              >
                <textarea
                  id="feedback-improvements"
                  name="improvements"
                  className={`${controlClassName} min-h-20`}
                  maxLength={2000}
                  required
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
                <input type="checkbox" name="isShared" /> Compartilhar este
                feedback com a outra parte
              </label>
              <Button type="submit" className="sm:col-span-2">
                Salvar feedback
              </Button>
            </form>
          ) : hasSubmittedFeedback ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e8f5e9] px-3 py-2 text-xs font-extrabold text-[#28713c]">
              <CheckCircle2 className="size-4" /> Seu feedback foi registrado
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
