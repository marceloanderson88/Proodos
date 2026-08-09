import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  deletePendingDiagnosticAssessmentAction,
  updatePendingDiagnosticAssessmentAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { inputClassName, SubmitButton } from "@/components/m6/form-controls";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import type { Database } from "@/lib/supabase/database.types";

type Campaign = Database["public"]["Tables"]["diagnostic_campaigns"]["Row"];
type Participant =
  Database["public"]["Tables"]["diagnostic_campaign_startups"]["Row"];
type Assessment = Database["public"]["Tables"]["diagnostic_assessments"]["Row"];

const statusLabel: Record<Participant["status"], string> = {
  invited: "Convidada",
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  submitted: "Enviada",
  overdue: "Atrasada",
  validated: "Validada",
  cancelled: "Cancelada",
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function DiagnosticCampaignDetail({
  organizationSlug,
  incubatorSlug,
  campaign,
  participants,
  assessments,
  startups,
  templates,
  profiles,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  campaign: Campaign;
  participants: Participant[];
  assessments: Assessment[];
  startups: { id: string; name: string }[];
  templates: {
    id: string;
    name: string;
    version: number;
    version_label: string | null;
  }[];
  profiles: { id: string; display_name: string | null; email: string | null }[];
  success?: string;
  error?: string;
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const updatePending = updatePendingDiagnosticAssessmentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const deletePending = deletePendingDiagnosticAssessmentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const template = templates.find((item) => item.id === campaign.template_id);
  const count = (status: Participant["status"]) =>
    participants.filter((item) => item.status === status).length;
  const cards = [
    [Users, "Convidadas", participants.length, "bg-[#f1eafb] text-[#6a2aad]"],
    [
      Clock3,
      "Não iniciadas",
      count("invited") + count("not_started"),
      "bg-[#fff3da] text-[#a56500]",
    ],
    [
      RefreshCw,
      "Em andamento",
      count("in_progress"),
      "bg-[#e8f3ff] text-[#1768b0]",
    ],
    [Send, "Enviadas", count("submitted"), "bg-[#e8f7ec] text-[#2f8545]"],
    [
      ShieldCheck,
      "Validadas",
      count("validated"),
      "bg-[#eee8fb] text-[#6631a8]",
    ],
  ] as const;

  return (
    <div className="page-enter space-y-6">
      <Link
        href={base}
        className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
      >
        <ArrowLeft className="size-4" /> Voltar aos diagnósticos
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#3f090d]">
              {campaign.name}
            </h1>
            <span className="rounded-full bg-[#eaf6ec] px-3 py-1 text-xs font-black text-[#2f7540]">
              {campaign.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-3 text-sm text-[#806f6b]">
            {dateTime(campaign.starts_at)} — {dateTime(campaign.ends_at)} ·{" "}
            {template?.name ?? "Modelo"} v
            {template?.version_label ?? template?.version ?? "—"}
          </p>
        </div>
        <a
          href={`${base}/campanhas/${campaign.id}/export`}
          download
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#8b161d]/15 bg-white px-4 text-sm font-black text-[#7b161c] shadow-sm"
        >
          <Download className="size-4" /> Exportar CSV
        </a>
      </header>
      <FeedbackBanner success={success} error={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([Icon, label, value, tone]) => (
          <article key={label} className="dashboard-card rounded-[1.4rem] p-5">
            <span
              className={`grid size-11 place-items-center rounded-2xl ${tone}`}
            >
              <Icon className="size-5" />
            </span>
            <p className="mt-4 text-[0.65rem] font-black tracking-[0.1em] text-[#806f6b] uppercase">
              {label}
            </p>
            <p className="text-3xl font-black text-[#3f090d]">{value}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-card overflow-hidden rounded-[1.6rem]">
        <div className="border-b border-[#751118]/8 px-5 py-5 sm:px-6">
          <p className="text-[0.65rem] font-black tracking-[0.13em] text-[#9a2930] uppercase">
            Acompanhamento
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#481014]">
            Participantes da campanha
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#fcf8f5] text-[0.64rem] tracking-[0.1em] text-[#7c6662] uppercase">
              <tr>
                <th className="px-6 py-4">Startup</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Avaliador</th>
                <th className="px-4 py-4">Auto</th>
                <th className="px-4 py-4">Oficial</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#751118]/8">
              {participants.map((participant) => {
                const startup = startups.find(
                  (item) => item.id === participant.startup_id,
                );
                const assessment = assessments.find(
                  (item) => item.campaign_startup_id === participant.id,
                );
                const evaluator = profiles.find(
                  (item) => item.id === participant.evaluator_id,
                );
                const isPending =
                  assessment?.status === "draft" &&
                  ["invited", "not_started"].includes(participant.status);
                return (
                  <tr
                    key={participant.id}
                    className="transition hover:bg-[#fcf8f5]"
                  >
                    <td className="px-6 py-4 font-black text-[#481014]">
                      {startup?.name ?? "Startup"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#f2ede9] px-2.5 py-1 text-xs font-black text-[#665551]">
                        {statusLabel[participant.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#6f5d59]">
                      {evaluator?.display_name ||
                        evaluator?.email ||
                        "A definir"}
                    </td>
                    <td className="px-4 py-4 font-black text-[#7a171d]">
                      {assessment?.self_score == null
                        ? "—"
                        : Number(assessment.self_score).toFixed(0)}
                    </td>
                    <td className="px-4 py-4 font-black text-[#2f7540]">
                      {assessment?.validated_score == null
                        ? "—"
                        : Number(assessment.validated_score).toFixed(0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {assessment && (
                        <div className="flex flex-wrap justify-end gap-3">
                          <Link
                            href={`${base}/avaliacoes/${assessment.id}`}
                            className="font-black text-[#8b161d]"
                          >
                            Avaliação
                          </Link>
                          <Link
                            href={`${base}/startups/${participant.startup_id}/avaliacoes/${assessment.id}`}
                            className="inline-flex items-center gap-1 font-black text-[#8b161d]"
                          >
                            Resultado <ArrowRight className="size-4" />
                          </Link>
                          {isPending && (
                            <details className="relative text-left">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-black text-[#8b161d]">
                                <Pencil className="size-3.5" /> Editar
                              </summary>
                              <form
                                action={updatePending}
                                className="absolute top-8 right-0 z-20 w-[22rem] space-y-3 rounded-2xl border border-[#751118]/12 bg-white p-4 shadow-[0_20px_55px_rgb(63_9_13/20%)]"
                              >
                                <input
                                  type="hidden"
                                  name="assessmentId"
                                  value={assessment.id}
                                />
                                <input
                                  type="hidden"
                                  name="campaignId"
                                  value={campaign.id}
                                />
                                <label className="block text-xs font-black text-[#5b4545]">
                                  Nome do ciclo
                                  <input
                                    className={inputClassName}
                                    name="cycleLabel"
                                    defaultValue={assessment.cycle_label}
                                    minLength={2}
                                    maxLength={120}
                                    required
                                  />
                                </label>
                                <label className="block text-xs font-black text-[#5b4545]">
                                  Prazo
                                  <input
                                    className={inputClassName}
                                    name="dueAt"
                                    type="datetime-local"
                                    defaultValue={dateTimeLocal(
                                      assessment.due_at ?? campaign.ends_at,
                                    )}
                                    min={dateTimeLocal(campaign.starts_at)}
                                    max={dateTimeLocal(campaign.ends_at)}
                                    required
                                  />
                                </label>
                                <label className="block text-xs font-black text-[#5b4545]">
                                  {campaign.execution_mode === "facilitated"
                                    ? "Responsável pela aplicação"
                                    : "Responsável pela validação (opcional)"}
                                  <select
                                    className={inputClassName}
                                    name="evaluatorId"
                                    defaultValue={assessment.evaluator_id ?? ""}
                                    required={
                                      campaign.execution_mode === "facilitated"
                                    }
                                  >
                                    <option value="">A definir</option>
                                    {profiles.map((profile) => (
                                      <option
                                        key={profile.id}
                                        value={profile.id}
                                      >
                                        {profile.display_name ||
                                          profile.email ||
                                          "Pessoa sem nome"}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p className="text-[0.68rem] leading-5 text-[#806f6b]">
                                  A edição é bloqueada automaticamente assim que
                                  alguém começa a responder.
                                </p>
                                <SubmitButton>Salvar aplicação</SubmitButton>
                              </form>
                            </details>
                          )}
                          {isPending && (
                            <form action={deletePending}>
                              <input
                                type="hidden"
                                name="assessmentId"
                                value={assessment.id}
                              />
                              <input
                                type="hidden"
                                name="campaignId"
                                value={campaign.id}
                              />
                              <ConfirmSubmitButton
                                message={`Remover o diagnóstico de ${startup?.name ?? "esta startup"} da campanha? Esta ação só será aceita se ele ainda não tiver sido iniciado.`}
                                variant="ghost"
                              >
                                <Trash2 className="size-3.5" /> Excluir
                              </ConfirmSubmitButton>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {participants.length === 0 && (
          <p className="p-8 text-center text-sm text-[#806f6b]">
            Nenhuma startup vinculada.
          </p>
        )}
      </section>

      {count("validated") === participants.length &&
        participants.length > 0 && (
          <div className="flex items-center gap-3 rounded-[1.4rem] border border-[#aad6b5] bg-[#eff9f1] p-5 text-sm font-bold text-[#2f6840]">
            <CheckCircle2 className="size-5" /> Todas as aplicações foram
            validadas.
          </div>
        )}
    </div>
  );
}
