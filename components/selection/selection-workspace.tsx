import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gavel,
  Link2,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { SelectionCallBuilder } from "@/components/selection/selection-call-builder";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  SelectionApplication,
  SelectionCall,
  SelectionView,
  SelectionWorkspaceData,
} from "@/lib/selection/types";

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--wine-500)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--wine-700)_9%,transparent)]";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicada",
  applications_open: "Inscrições abertas",
  applications_closed: "Inscrições encerradas",
  evaluating: "Em avaliação",
  preliminary_result: "Resultado preliminar",
  appeals: "Recursos",
  final_result: "Resultado final",
  completed: "Concluída",
  cancelled: "Cancelada",
  submitted: "Inscrita",
  eligible: "Habilitada",
  ineligible: "Inabilitada",
  under_review: "Em avaliação",
  reviewed: "Avaliada",
  selected: "Selecionada",
  waitlisted: "Suplente",
  not_selected: "Não selecionada",
  assigned: "Atribuída",
  in_progress: "Em andamento",
  conflict: "Impedimento",
  converted: "Matriculada",
  pending: "Pendente",
};

function label(value: string) {
  return statusLabels[value] ?? value.replaceAll("_", " ");
}

function tone(
  value: string,
): "neutral" | "success" | "warning" | "danger" | "info" {
  if (
    ["eligible", "selected", "completed", "converted", "final_result"].includes(
      value,
    )
  )
    return "success";
  if (["ineligible", "cancelled", "conflict", "denied"].includes(value))
    return "danger";
  if (["applications_open", "waitlisted", "pending", "appeals"].includes(value))
    return "warning";
  if (
    ["under_review", "reviewed", "evaluating", "preliminary_result"].includes(
      value,
    )
  )
    return "info";
  return "neutral";
}

function fmt(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

function callName(calls: SelectionCall[], id: string) {
  return calls.find((call) => call.id === id)?.title ?? "Chamada";
}

function applicationName(applications: SelectionApplication[], id: string) {
  return (
    applications.find((application) => application.id === id)?.startup_name ??
    "Proposta"
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--wine-950)]">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

export function SelectionWorkspace({
  view,
  data,
  currentUserId,
  success,
  error,
  actions,
}: {
  view: SelectionView;
  data: SelectionWorkspaceData;
  currentUserId: string;
  success?: string;
  error?: string;
  actions: {
    createCall: (formData: FormData) => void | Promise<void>;
    publishCall: (formData: FormData) => void | Promise<void>;
    eligibility: (formData: FormData) => void | Promise<void>;
    addReviewer: (formData: FormData) => void | Promise<void>;
    acceptConfidentiality: (formData: FormData) => void | Promise<void>;
    assignReviewer: (formData: FormData) => void | Promise<void>;
    autoAssignReviewers: (formData: FormData) => void | Promise<void>;
    submitReview: (formData: FormData) => void | Promise<void>;
    declareConflict: (formData: FormData) => void | Promise<void>;
    generateRanking: (formData: FormData) => void | Promise<void>;
    decideAppeal: (formData: FormData) => void | Promise<void>;
    publishResult: (formData: FormData) => void | Promise<void>;
    createConvocations: (formData: FormData) => void | Promise<void>;
    convertApplication: (formData: FormData) => void | Promise<void>;
  };
}) {
  const openCalls = data.calls.filter((call) =>
    ["published", "applications_open"].includes(call.status),
  );
  const pendingApplications = data.applications.filter(
    (application) => application.status === "submitted",
  );
  const myAssignments = data.assignments.filter(
    (assignment) =>
      assignment.reviewer_user_id === currentUserId &&
      ["assigned", "in_progress"].includes(assignment.status),
  );
  const latestRankings = data.calls.flatMap((call) => {
    const rows = data.rankings.filter((ranking) => ranking.call_id === call.id);
    const version = Math.max(0, ...rows.map((ranking) => ranking.version));
    return rows.filter((ranking) => ranking.version === version);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seleção de empreendimentos"
        title="Chamadas e propostas"
        description="Do edital à matrícula: inscrições, habilitação, avaliação independente, ranking, recursos e convocação em um fluxo auditável."
        icon={Gavel}
        actions={
          <Link
            href="/chamadas"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-extrabold text-[var(--wine-800)]"
          >
            <Link2 className="size-4" /> Portal público
          </Link>
        }
      />
      <FeedbackBanner success={success} error={error} />

      {view === "overview" && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                [
                  data.calls.length,
                  "Chamadas",
                  FileText,
                  "Ciclos publicados e históricos",
                ],
                [
                  openCalls.length,
                  "Recebendo inscrições",
                  Send,
                  "Janelas públicas ativas",
                ],
                [
                  pendingApplications.length,
                  "Aguardam habilitação",
                  ShieldCheck,
                  "Fila documental",
                ],
                [
                  myAssignments.length,
                  "Minhas avaliações",
                  ClipboardCheck,
                  "Propostas sob sua responsabilidade",
                ],
              ] as Array<[number, string, typeof FileText, string]>
            ).map(([number, title, Icon, description]) => (
              <article
                key={String(title)}
                className="surface-card group relative overflow-hidden p-5"
              >
                <div className="absolute -top-8 -right-8 size-28 rounded-full bg-[#f4c47a]/18 transition group-hover:scale-125" />
                <Icon
                  className="relative size-5 text-[#d97918]"
                  aria-hidden="true"
                />
                <p className="relative mt-5 text-4xl font-black tracking-[-0.05em] text-[var(--wine-950)]">
                  {String(number)}
                </p>
                <h2 className="relative mt-1 text-sm font-black text-[var(--wine-900)]">
                  {String(title)}
                </h2>
                <p className="relative mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  {String(description)}
                </p>
              </article>
            ))}
          </section>
          <section className="surface-card overflow-hidden">
            <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_.8fr] lg:p-8">
              <div>
                <p className="eyebrow">Fluxo controlado</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--wine-950)]">
                  Uma trilha única, sem cadastros duplicados
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    "Publicar formulário versionado",
                    "Habilitar sem expor dados",
                    "Distribuir sem apagar avaliações",
                    "Converter selecionadas em matrículas",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl bg-[#fbf5ef] p-3 text-sm font-bold text-[var(--wine-900)]"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--wine-800)] text-xs text-white">
                        {index + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-[var(--wine-950)] p-6 text-white">
                <Sparkles className="size-5 text-[#f4c47a]" />
                <p className="mt-5 text-3xl font-black">
                  {data.applications.length}
                </p>
                <p className="mt-1 text-sm font-bold text-white/70">
                  propostas recebidas no histórico
                </p>
                <div className="mt-6 h-px bg-white/10" />
                <p className="mt-5 text-xs leading-6 text-white/60">
                  O resultado final mantém um snapshot versionado.
                  Reprocessamentos não sobrescrevem classificações anteriores.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {view === "calls" && (
        <div className="space-y-7">
          <section className="grid gap-4 lg:grid-cols-2">
            {data.calls.map((call) => (
              <article key={call.id} className="surface-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{call.code}</p>
                    <h2 className="mt-2 text-xl font-black text-[var(--wine-950)]">
                      {call.title}
                    </h2>
                  </div>
                  <StatusBadge tone={tone(call.status)}>
                    {label(call.status)}
                  </StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  {call.summary || "Sem apresentação."}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#fbf5ef] p-4 text-xs">
                  <div>
                    <dt className="font-bold text-[var(--text-muted)]">
                      Inscrições
                    </dt>
                    <dd className="mt-1 font-black text-[var(--wine-900)]">
                      {fmt(call.applications_open_at)} —{" "}
                      {fmt(call.applications_close_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[var(--text-muted)]">
                      Seleção
                    </dt>
                    <dd className="mt-1 font-black text-[var(--wine-900)]">
                      {call.total_vacancies} vagas ·{" "}
                      {call.reviewers_per_application} notas
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] px-3 text-xs font-extrabold text-[var(--wine-800)]"
                    href={`/chamadas/${call.slug}`}
                  >
                    Ver página pública
                  </Link>
                  {call.status === "draft" && data.canManage && (
                    <form action={actions.publishCall}>
                      <input type="hidden" name="callId" value={call.id} />
                      <Button
                        type="submit"
                        className="min-h-10 px-3 py-2 text-xs"
                      >
                        Publicar
                      </Button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </section>
          {data.canManage && (
            <section className="surface-card p-6 sm:p-8">
              <SectionTitle
                eyebrow="Nova chamada"
                title="Construa o edital operacional"
                description="A turma é o destino; o formulário e a rubrica serão congelados no momento da publicação."
              />
              <div className="mt-7">
                <SelectionCallBuilder
                  action={actions.createCall}
                  programs={data.programs}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {view === "applications" && (
        <section className="space-y-4">
          <SectionTitle
            eyebrow="Habilitação"
            title="Inscrições recebidas"
            description="Valide requisitos formais antes de qualquer proposta seguir para os avaliadores."
          />
          {data.applications.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma inscrição"
              description="As propostas aparecerão aqui após o envio pelo portal público."
            />
          ) : (
            data.applications.map((application) => (
              <article key={application.id} className="surface-card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-[var(--wine-950)]">
                        {application.startup_name}
                      </h3>
                      <StatusBadge tone={tone(application.status)}>
                        {label(application.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[var(--text-muted)]">
                      {application.protocol} ·{" "}
                      {callName(data.calls, application.call_id)} ·{" "}
                      {fmt(application.submitted_at)}
                    </p>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                      {application.summary || "Sem resumo executivo."}
                    </p>
                    <p className="mt-3 text-xs text-[var(--text-muted)]">
                      {application.applicant_name} ·{" "}
                      {application.applicant_email} ·{" "}
                      {[application.city, application.state]
                        .filter(Boolean)
                        .join("/") || "Local não informado"}
                    </p>
                  </div>
                  {data.canManage &&
                    ["submitted", "eligible", "ineligible"].includes(
                      application.status,
                    ) && (
                      <form
                        action={actions.eligibility}
                        className="grid min-w-full gap-2 sm:grid-cols-[1fr_auto_auto] xl:min-w-[34rem]"
                      >
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />
                        <input
                          className={inputClass}
                          name="notes"
                          placeholder="Parecer de habilitação"
                        />
                        <Button type="submit" name="decision" value="eligible">
                          <CheckCircle2 className="size-4" /> Habilitar
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="ineligible"
                          variant="danger"
                        >
                          Inabilitar
                        </Button>
                      </form>
                    )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {view === "reviewers" && (
        <div className="space-y-7">
          <SectionTitle
            eyebrow="Banca"
            title="Avaliadores e distribuição"
            description="Atribuições adicionais preservam integralmente avaliações, impedimentos e histórico."
          />
          {data.canManage && (
            <section className="grid gap-5 lg:grid-cols-2">
              <form
                action={actions.addReviewer}
                className="surface-card space-y-4 p-5"
              >
                <h3 className="font-black text-[var(--wine-950)]">
                  Adicionar avaliador
                </h3>
                <select className={inputClass} name="callId" required>
                  <option value="">Chamada</option>
                  {data.calls.map((call) => (
                    <option key={call.id} value={call.id}>
                      {call.title}
                    </option>
                  ))}
                </select>
                <select className={inputClass} name="userId" required>
                  <option value="">Pessoa da organização</option>
                  {data.eligiblePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name} · {person.email}
                    </option>
                  ))}
                </select>
                <Button type="submit">
                  <UserRoundCheck className="size-4" /> Incluir na banca
                </Button>
              </form>
              <div className="surface-card space-y-5 p-5">
                <form action={actions.assignReviewer} className="space-y-4">
                  <h3 className="font-black text-[var(--wine-950)]">
                    Distribuir proposta
                  </h3>
                  <select className={inputClass} name="applicationId" required>
                    <option value="">Inscrição habilitada</option>
                    {data.applications
                      .filter((item) =>
                        ["eligible", "under_review"].includes(item.status),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.startup_name} · {item.protocol}
                        </option>
                      ))}
                  </select>
                  <select className={inputClass} name="reviewerId" required>
                    <option value="">Avaliador</option>
                    {data.reviewers
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.display_name} ·{" "}
                          {callName(data.calls, item.call_id)}
                        </option>
                      ))}
                  </select>
                  <Button type="submit">
                    <UsersRound className="size-4" /> Atribuir manualmente
                  </Button>
                </form>
                <div className="h-px bg-[var(--border)]" />
                <form
                  action={actions.autoAssignReviewers}
                  className="flex gap-2"
                >
                  <select className={inputClass} name="callId" required>
                    <option value="">
                      Chamada para distribuição automática
                    </option>
                    {data.calls.map((call) => (
                      <option key={call.id} value={call.id}>
                        {call.title}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary">
                    Equilibrar banca
                  </Button>
                </form>
              </div>
            </section>
          )}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.reviewers.map((reviewer) => (
              <article key={reviewer.id} className="surface-card p-5">
                <div className="grid size-10 place-items-center rounded-full bg-[#f5e2d5] font-black text-[var(--wine-800)]">
                  {reviewer.display_name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="mt-4 font-black text-[var(--wine-950)]">
                  {reviewer.display_name}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {reviewer.email}
                </p>
                <p className="mt-3 text-xs font-bold text-[#8a4c08]">
                  {callName(data.calls, reviewer.call_id)}
                </p>
              </article>
            ))}
          </section>
        </div>
      )}

      {view === "reviews" && (
        <section className="space-y-5">
          <SectionTitle
            eyebrow="Avaliação independente"
            title="Propostas atribuídas"
            description="Notas são validadas contra a escala de cada critério e calculadas no banco com os pesos publicados."
          />
          {myAssignments.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhuma avaliação pendente"
              description="As novas atribuições aparecerão nesta área."
            />
          ) : (
            myAssignments.map((assignment) => {
              const application = data.applications.find(
                (item) => item.id === assignment.application_id,
              );
              const criteria = data.criteria.filter(
                (item) => item.call_id === assignment.call_id,
              );
              const reviewer = data.reviewers.find(
                (item) => item.id === assignment.reviewer_id,
              );
              if (!reviewer?.confidentiality_accepted_at)
                return (
                  <article key={assignment.id} className="surface-card p-6">
                    <p className="eyebrow">Confidencialidade</p>
                    <h3 className="mt-2 text-xl font-black text-[var(--wine-950)]">
                      Aceite necessário para avaliar{" "}
                      {application?.startup_name ?? "a proposta"}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                      Comprometo-me a manter em sigilo as informações da
                      proposta, utilizá-las apenas nesta seleção e declarar
                      qualquer conflito de interesse.
                    </p>
                    <form
                      action={actions.acceptConfidentiality}
                      className="mt-5"
                    >
                      <input
                        type="hidden"
                        name="callId"
                        value={assignment.call_id}
                      />
                      <Button type="submit">
                        Aceitar termo e liberar avaliação
                      </Button>
                    </form>
                  </article>
                );
              return (
                <article
                  key={assignment.id}
                  className="surface-card overflow-hidden"
                >
                  <div className="border-b border-[var(--border)] bg-[#fbf5ef] p-5">
                    <p className="eyebrow">
                      {callName(data.calls, assignment.call_id)}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-[var(--wine-950)]">
                      {application?.startup_name ?? "Proposta"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {application?.summary ||
                        "Consulte os dados apresentados na proposta."}
                    </p>
                    {application &&
                      Object.keys(application.answers).length > 0 && (
                        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                          {Object.entries(application.answers).map(
                            ([answerCode, answer]) => (
                              <div
                                key={answerCode}
                                className="rounded-xl bg-white p-3"
                              >
                                <dt className="text-[.65rem] font-black tracking-[.1em] text-[var(--text-muted)] uppercase">
                                  {answerCode.replaceAll("_", " ")}
                                </dt>
                                <dd className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[var(--wine-950)]">
                                  {Array.isArray(answer)
                                    ? answer.join(", ")
                                    : String(answer ?? "—")}
                                </dd>
                              </div>
                            ),
                          )}
                        </dl>
                      )}
                  </div>
                  <div className="grid gap-6 p-5 lg:grid-cols-[1fr_19rem]">
                    <form action={actions.submitReview} className="space-y-4">
                      <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                      />
                      {criteria.map((criterion) => (
                        <label
                          key={criterion.id}
                          className="grid gap-3 rounded-xl border border-[var(--border)] p-4 sm:grid-cols-[1fr_8rem]"
                        >
                          <span>
                            <strong className="block text-sm text-[var(--wine-950)]">
                              {criterion.name} · peso {criterion.weight}
                            </strong>
                            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                              {criterion.description}
                            </span>
                          </span>
                          <input
                            className={inputClass}
                            type="number"
                            step="0.1"
                            min={criterion.min_score}
                            max={criterion.max_score}
                            name={`score_${criterion.code}`}
                            required
                            placeholder={`${criterion.min_score}–${criterion.max_score}`}
                          />
                        </label>
                      ))}
                      <textarea
                        className={`${inputClass} min-h-28`}
                        name="generalJustification"
                        required
                        minLength={30}
                        placeholder="Justificativa geral da avaliação (mínimo de 30 caracteres)"
                      />
                      <textarea
                        className={`${inputClass} min-h-20`}
                        name="privateNotes"
                        placeholder="Notas privadas para a coordenação"
                      />
                      <Button type="submit">
                        <ClipboardCheck className="size-4" /> Enviar avaliação
                      </Button>
                    </form>
                    <form
                      action={actions.declareConflict}
                      className="h-fit space-y-3 rounded-2xl border border-[#ad2b2f]/15 bg-[#fff6f5] p-4"
                    >
                      <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                      />
                      <h4 className="font-black text-[var(--wine-900)]">
                        Impedimento
                      </h4>
                      <select className={inputClass} name="reasonType">
                        <option value="ownership">Societário</option>
                        <option value="professional">Profissional</option>
                        <option value="family">Parentesco</option>
                        <option value="other">Outro</option>
                      </select>
                      <textarea
                        className={`${inputClass} min-h-24`}
                        name="justification"
                        required
                        minLength={20}
                        placeholder="Justifique o conflito de interesse"
                      />
                      <Button type="submit" variant="danger" className="w-full">
                        Declarar impedimento
                      </Button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {view === "ranking" && (
        <div className="space-y-6">
          <SectionTitle
            eyebrow="Classificação versionada"
            title="Ranking das propostas"
            description="O processamento é bloqueado enquanto houver inscrição elegível sem o número mínimo de avaliações."
          />
          {data.canPublish && (
            <section className="surface-card p-5">
              <form
                action={actions.generateRanking}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <select className={inputClass} name="callId" required>
                  <option value="">Selecione a chamada</option>
                  {data.calls.map((call) => (
                    <option key={call.id} value={call.id}>
                      {call.title}
                    </option>
                  ))}
                </select>
                <Button type="submit">
                  <Award className="size-4" /> Gerar nova versão
                </Button>
              </form>
            </section>
          )}
          <section className="surface-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#fbf5ef] text-xs font-black text-[var(--text-muted)] uppercase">
                <tr>
                  <th className="px-5 py-4">Posição</th>
                  <th className="px-5 py-4">Proposta</th>
                  <th className="px-5 py-4">Nota</th>
                  <th className="px-5 py-4">Avaliações</th>
                  <th className="px-5 py-4">Divergência</th>
                  <th className="px-5 py-4">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {latestRankings.map((ranking) => (
                  <tr
                    key={ranking.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-5 py-4 text-lg font-black text-[var(--wine-950)]">
                      #{ranking.general_position}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {applicationName(
                        data.applications,
                        ranking.application_id,
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-[var(--wine-800)]">
                      {Number(ranking.average_score).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">{ranking.review_count}</td>
                    <td className="px-5 py-4">
                      {ranking.divergence == null
                        ? "—"
                        : `${Number(ranking.divergence).toFixed(1)}%`}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge tone={tone(ranking.outcome)}>
                        {label(ranking.outcome)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {view === "appeals" && (
        <section className="space-y-5">
          <SectionTitle
            eyebrow="Contraditório"
            title="Recursos administrativos"
            description="Decisões e ajustes de nota são registrados sem alterar avaliações individuais."
          />
          {data.appeals.length === 0 ? (
            <EmptyState
              icon={Gavel}
              title="Nenhum recurso"
              description="Recursos protocolados durante a janela da chamada aparecerão aqui."
            />
          ) : (
            data.appeals.map((appeal) => (
              <article key={appeal.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[var(--wine-950)]">
                      {applicationName(
                        data.applications,
                        appeal.application_id,
                      )}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                      {appeal.grounds}
                    </p>
                  </div>
                  <StatusBadge tone={tone(appeal.status)}>
                    {label(appeal.status)}
                  </StatusBadge>
                </div>
                {data.canManage &&
                  ["submitted", "under_review"].includes(appeal.status) && (
                    <form
                      action={actions.decideAppeal}
                      className="mt-5 grid gap-3 lg:grid-cols-[12rem_1fr_10rem_auto]"
                    >
                      <input type="hidden" name="appealId" value={appeal.id} />
                      <select className={inputClass} name="status">
                        <option value="granted">Deferido</option>
                        <option value="partially_granted">Parcial</option>
                        <option value="denied">Indeferido</option>
                      </select>
                      <input
                        className={inputClass}
                        name="decision"
                        required
                        placeholder="Fundamentação da decisão"
                      />
                      <input
                        className={inputClass}
                        name="scoreAdjustment"
                        type="number"
                        step="0.01"
                        placeholder="Ajuste opcional"
                      />
                      <Button type="submit">Decidir</Button>
                    </form>
                  )}
              </article>
            ))
          )}
        </section>
      )}

      {view === "results" && (
        <div className="space-y-6">
          <SectionTitle
            eyebrow="Publicação e ingresso"
            title="Resultados, convocações e matrículas"
            description="A publicação usa o último snapshot; a conversão cria ou reaproveita a startup e registra a matrícula na turma de destino."
          />
          {data.canPublish && (
            <section className="grid gap-5 lg:grid-cols-2">
              <form
                action={actions.publishResult}
                className="surface-card space-y-3 p-5"
              >
                <h3 className="font-black text-[var(--wine-950)]">
                  Publicar resultado
                </h3>
                <select className={inputClass} name="callId" required>
                  <option value="">Chamada</option>
                  {data.calls.map((call) => (
                    <option key={call.id} value={call.id}>
                      {call.title}
                    </option>
                  ))}
                </select>
                <select className={inputClass} name="phase">
                  <option value="preliminary">Preliminar</option>
                  <option value="final">Final</option>
                </select>
                <input
                  className={inputClass}
                  name="title"
                  required
                  placeholder="Título da publicação"
                />
                <textarea
                  className={`${inputClass} min-h-20`}
                  name="content"
                  placeholder="Comunicado público"
                />
                <Button type="submit">
                  <Send className="size-4" /> Publicar
                </Button>
              </form>
              <form
                action={actions.createConvocations}
                className="surface-card space-y-3 p-5"
              >
                <h3 className="font-black text-[var(--wine-950)]">
                  Convocar selecionadas
                </h3>
                <select className={inputClass} name="callId" required>
                  <option value="">Chamada</option>
                  {data.calls.map((call) => (
                    <option key={call.id} value={call.id}>
                      {call.title}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  type="datetime-local"
                  name="deadlineAt"
                  required
                />
                <Button type="submit">
                  <UsersRound className="size-4" /> Preparar convocações
                </Button>
              </form>
            </section>
          )}
          <section className="space-y-3">
            {data.convocations.map((convocation) => {
              const application = data.applications.find(
                (item) => item.id === convocation.application_id,
              );
              return (
                <article
                  key={convocation.id}
                  className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-[var(--wine-950)]">
                        {application?.startup_name ?? "Startup"}
                      </h3>
                      <StatusBadge tone={tone(convocation.status)}>
                        {label(convocation.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Prazo: {fmt(convocation.deadline_at)} ·{" "}
                      {application?.protocol}
                    </p>
                  </div>
                  {data.canPublish &&
                    convocation.status === "accepted" &&
                    !convocation.converted_startup_id && (
                      <form action={actions.convertApplication}>
                        <input
                          type="hidden"
                          name="applicationId"
                          value={convocation.application_id}
                        />
                        <Button type="submit">
                          <CheckCircle2 className="size-4" /> Criar startup e
                          matrícula
                        </Button>
                      </form>
                    )}
                  {data.canPublish &&
                    convocation.status !== "accepted" &&
                    !convocation.converted_startup_id && (
                      <p className="max-w-64 text-xs font-bold text-[var(--text-muted)]">
                        A matrícula será liberada após o aceite da convocação.
                      </p>
                    )}
                </article>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
