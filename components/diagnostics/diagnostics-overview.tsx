import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  Plus,
  Rocket,
} from "lucide-react";
import Link from "next/link";

import { installDiagnosticDemoCasesAction } from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { SubmitButton } from "@/components/m6/form-controls";

type Template = {
  id: string;
  name: string;
  description: string;
  status: "draft" | "published" | "archived";
  version: number;
  version_label: string | null;
  updated_at: string;
};

type Campaign = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "open" | "closed" | "cancelled";
  starts_at: string;
  ends_at: string;
  template_id: string;
  program_id: string | null;
};

type Assessment = {
  id: string;
  startup_id: string;
  template_id: string;
  cycle_label: string;
  status:
    | "draft"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "validated"
    | "cancelled";
  self_score: number | null;
  validated_score: number | null;
  classification_code: string | null;
  updated_at: string;
  execution_mode: "self_assessment" | "facilitated";
};

const campaignStatus = {
  draft: "Rascunho",
  scheduled: "Agendada",
  open: "Em andamento",
  closed: "Encerrada",
  cancelled: "Cancelada",
} as const;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function DiagnosticsOverview({
  organizationSlug,
  incubatorSlug,
  incubatorName,
  templates,
  dimensions,
  criteria,
  campaigns,
  participants,
  assessments,
  startups,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  incubatorName: string;
  templates: Template[];
  dimensions: { id: string; template_id: string }[];
  criteria: { id: string; template_id: string }[];
  campaigns: Campaign[];
  participants: { campaign_id: string; status: string }[];
  assessments: Assessment[];
  startups: { id: string; name: string; custom_fields: unknown }[];
  success?: string;
  error?: string;
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const publishedCount = templates.filter(
    (template) => template.status === "published",
  ).length;
  const activeCampaigns = campaigns.filter((campaign) =>
    ["scheduled", "open"].includes(campaign.status),
  ).length;
  const pendingReviews = assessments.filter((assessment) =>
    ["submitted", "under_review"].includes(assessment.status),
  ).length;
  const demoCount = startups.filter((startup) => {
    const fields = startup.custom_fields;
    return Boolean(
      fields &&
      typeof fields === "object" &&
      "is_demo" in fields &&
      fields.is_demo === true,
    );
  }).length;
  const installDemos = installDiagnosticDemoCasesAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );

  return (
    <div className="page-enter space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#4a0910] px-6 py-8 text-white shadow-[0_24px_70px_rgb(63_9_13/18%)] sm:px-9">
        <div className="relative z-10 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-black tracking-[0.14em] uppercase">
              <ClipboardCheck className="size-3.5" /> Ciclos de avaliação
              versionados
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Diagnósticos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Biblioteca de modelos, campanhas, autoavaliação e validação da{" "}
              {incubatorName}. Cada aplicação pertence a uma startup e preserva
              seu histórico.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`${base}/modelos/novo`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
            >
              <Plus className="size-4" /> Novo modelo
            </Link>
            <Link
              href={`${base}/campanhas/nova`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#6f0d14] shadow-lg transition hover:-translate-y-0.5"
            >
              <Plus className="size-4" /> Nova campanha
            </Link>
          </div>
        </div>
        <div className="absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-[#bd1644]/25 blur-3xl" />
      </header>

      <FeedbackBanner success={success} error={error} />

      <section className="flex flex-col justify-between gap-4 rounded-[1.4rem] border border-[#d6a761]/35 bg-[#fff8ea] p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[0.65rem] font-black tracking-[0.12em] text-[#8a5216] uppercase">
            Ambiente de demonstração opcional
          </p>
          <h2 className="mt-1 font-black text-[#481014]">
            Casos fictícios para conhecer o fluxo completo
          </h2>
          <p className="mt-1 text-sm text-[#806f6b]">
            Instala 1 programa, 1 turma, 3 startups e 6 aplicações temporais nos
            dois modos, todos marcados como [EXEMPLO]. Nenhum dado real é
            alterado.
          </p>
        </div>
        {demoCount > 0 ? (
          <span className="shrink-0 rounded-full bg-[#e8f5e9] px-4 py-2 text-xs font-black text-[#28713c]">
            {demoCount} exemplos instalados
          </span>
        ) : (
          <form action={installDemos}>
            <input type="hidden" name="confirmation" value="INSTALL_DEMOS" />
            <SubmitButton>Instalar exemplos fictícios</SubmitButton>
          </form>
        )}
      </section>

      <section
        aria-label="Resumo de diagnósticos"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          [Layers3, "Modelos publicados", publishedCount, "Versões imutáveis"],
          [
            CalendarClock,
            "Campanhas ativas",
            activeCampaigns,
            "Agendadas ou abertas",
          ],
          [
            Rocket,
            "Startups avaliadas",
            new Set(assessments.map((item) => item.startup_id)).size,
            `${startups.length} cadastradas`,
          ],
          [
            CheckCircle2,
            "Aguardando validação",
            pendingReviews,
            "Envios em revisão",
          ],
        ].map(([Icon, label, value, hint]) => {
          const CardIcon = Icon as typeof Layers3;
          return (
            <article
              key={String(label)}
              className="dashboard-card rounded-[1.4rem] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#f5e2d5] text-[#7b1118]">
                  <CardIcon className="size-5" />
                </span>
                <div>
                  <p className="text-[0.64rem] font-black tracking-[0.1em] text-[#896f6b] uppercase">
                    {String(label)}
                  </p>
                  <p className="text-3xl font-black text-[#3f090d]">
                    {String(value)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#8b7773]">{String(hint)}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-card overflow-hidden rounded-[1.6rem]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#751118]/8 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[0.65rem] font-black tracking-[0.13em] text-[#9a2930] uppercase">
              Biblioteca da incubadora
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#481014]">
              Modelos de diagnóstico
            </h2>
          </div>
          <span className="rounded-full bg-[#f8ece5] px-3 py-1.5 text-xs font-bold text-[#7a2429]">
            {templates.length} versões
          </span>
        </div>
        <div className="divide-y divide-[#751118]/8">
          {templates.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#806f6b]">
              Nenhum modelo disponível.
            </p>
          ) : (
            templates.map((template) => {
              const dimensionCount = dimensions.filter(
                (item) => item.template_id === template.id,
              ).length;
              const criterionCount = criteria.filter(
                (item) => item.template_id === template.id,
              ).length;
              return (
                <Link
                  key={template.id}
                  href={`${base}/modelos/${template.id}`}
                  className="group grid gap-4 px-5 py-5 transition hover:bg-[#fcf7f3] sm:px-6 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fae9e7] text-[#a81e29]">
                      <Activity className="size-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[#3f090d]">
                          {template.name}
                        </h3>
                        <span
                          className={
                            template.status === "published"
                              ? "rounded-full bg-[#e8f5e9] px-2 py-1 text-[0.62rem] font-black text-[#28713c]"
                              : "rounded-full bg-[#fff0dd] px-2 py-1 text-[0.62rem] font-black text-[#8a5216]"
                          }
                        >
                          {template.status === "published"
                            ? "Publicado"
                            : "Rascunho"}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[#806f6b]">
                        {template.description || "Sem descrição."}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#6f5b58]">
                    <strong className="text-[#3f090d]">
                      v{template.version_label ?? template.version}
                    </strong>
                    <br />
                    versão
                  </p>
                  <p className="text-sm text-[#6f5b58]">
                    <strong className="text-[#3f090d]">{dimensionCount}</strong>
                    <br />
                    dimensões
                  </p>
                  <p className="flex items-center justify-between gap-3 text-sm font-black text-[#8b161d]">
                    {criterionCount} critérios{" "}
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="dashboard-card overflow-hidden rounded-[1.6rem]">
          <div className="flex items-center justify-between border-b border-[#751118]/8 px-5 py-5 sm:px-6">
            <div>
              <p className="text-[0.65rem] font-black tracking-[0.13em] text-[#9a2930] uppercase">
                Execução
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#481014]">
                Campanhas recentes
              </h2>
            </div>
            <Link
              href={`${base}/campanhas/nova`}
              className="text-sm font-black text-[#8b161d]"
            >
              Criar campanha
            </Link>
          </div>
          <div className="divide-y divide-[#751118]/8">
            {campaigns.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#806f6b]">
                Nenhuma campanha criada.
              </p>
            ) : (
              campaigns.slice(0, 5).map((campaign) => {
                const invited = participants.filter(
                  (item) => item.campaign_id === campaign.id,
                ).length;
                const completed = participants.filter(
                  (item) =>
                    item.campaign_id === campaign.id &&
                    item.status === "validated",
                ).length;
                return (
                  <Link
                    key={campaign.id}
                    href={`${base}/campanhas/${campaign.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fcf7f3] sm:px-6"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[#471014]">
                          {campaign.name}
                        </h3>
                        <span className="rounded-full bg-[#f1eee9] px-2 py-1 text-[0.62rem] font-black text-[#6f5b58]">
                          {campaignStatus[campaign.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#806f6b]">
                        {dateLabel(campaign.starts_at)} —{" "}
                        {dateLabel(campaign.ends_at)} · {completed}/{invited}{" "}
                        validadas
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-[#8b161d]" />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="dashboard-card overflow-hidden rounded-[1.6rem]">
          <div className="border-b border-[#751118]/8 px-5 py-5 sm:px-6">
            <p className="text-[0.65rem] font-black tracking-[0.13em] text-[#9a2930] uppercase">
              Aplicações
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#481014]">
              Atualizadas recentemente
            </h2>
          </div>
          <div className="divide-y divide-[#751118]/8">
            {assessments.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#806f6b]">
                Nenhuma aplicação iniciada.
              </p>
            ) : (
              assessments.slice(0, 6).map((assessment) => {
                const startup = startups.find(
                  (item) => item.id === assessment.startup_id,
                );
                const score =
                  assessment.validated_score ?? assessment.self_score;
                return (
                  <Link
                    key={assessment.id}
                    href={`${base}/avaliacoes/${assessment.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fcf7f3] sm:px-6"
                  >
                    <div>
                      <h3 className="font-black text-[#471014]">
                        {startup?.name ?? "Startup"}
                      </h3>
                      <p className="mt-1 text-xs text-[#806f6b]">
                        {assessment.cycle_label} ·{" "}
                        {assessment.execution_mode === "self_assessment"
                          ? "Autodiagnóstico"
                          : "Aplicação assistida"}{" "}
                        · {assessment.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#711019]">
                        {score === null ? "—" : Number(score).toFixed(0)}
                      </p>
                      <p className="text-[0.62rem] font-bold text-[#8c7773] uppercase">
                        {assessment.classification_code ?? "sem classificação"}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
