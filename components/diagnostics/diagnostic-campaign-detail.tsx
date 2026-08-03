import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { FeedbackBanner } from "@/components/m6/feedback-banner";
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
      <header>
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
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
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
                        <Link
                          href={`${base}/avaliacoes/${assessment.id}`}
                          className="inline-flex items-center gap-2 font-black text-[#8b161d]"
                        >
                          Abrir <ArrowRight className="size-4" />
                        </Link>
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
