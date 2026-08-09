import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  History,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import {
  DiagnosticDimensionBarChart,
  DiagnosticEvolutionChart,
  DiagnosticRadarChart,
} from "@/components/diagnostics/diagnostic-charts";

type DimensionPoint = {
  id: string;
  code: string | null;
  name: string;
  weight: number;
  selfScore: number | null;
  validatedScore: number | null;
};

type Trigger = {
  id: string;
  name: string;
  message: string;
  recommendedAction: string;
  severity: "info" | "warning" | "high" | "critical";
  status: string;
};

const severityLabel = {
  info: "Informativo",
  warning: "Atenção",
  high: "Alto",
  critical: "Crítico",
};

function score(value: number | null) {
  return value == null ? "—" : value.toFixed(0);
}

export function DiagnosticStartupDashboard({
  base,
  startup,
  assessment,
  template,
  campaignName,
  dimensions,
  triggers,
  notes,
}: {
  base: string;
  startup: { id: string; name: string; stage: string };
  assessment: {
    id: string;
    cycleLabel: string;
    status: string;
    selfScore: number | null;
    validatedScore: number | null;
    classificationCode: string | null;
    averageGap: number | null;
    evidenceCoverage: number | null;
    submittedAt: string | null;
    validatedAt: string | null;
    executionMode: "self_assessment" | "facilitated";
  };
  template: { name: string; versionLabel: string };
  campaignName: string | null;
  dimensions: DimensionPoint[];
  triggers: Trigger[];
  notes: { id: string; author_id: string; body: string; created_at: string }[];
}) {
  const activeTriggers = triggers.filter((item) => item.status === "triggered");
  const validated = assessment.validatedScore != null;

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${base}/avaliacoes/${assessment.id}`}
          className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
        >
          <ArrowLeft className="size-4" /> Voltar à avaliação
        </Link>
        <Link
          href={`${base}/startups/${startup.id}/historico`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#8b161d]/15 bg-white px-4 text-sm font-black text-[#7b161c] shadow-sm"
        >
          <History className="size-4" /> Histórico completo
        </Link>
      </div>

      <header className="dashboard-card overflow-hidden rounded-[1.8rem]">
        <div className="relative bg-[linear-gradient(120deg,#4a090d,#86151c_58%,#a62d2b)] p-6 text-white sm:p-8">
          <div className="absolute -top-20 right-8 size-56 rounded-full border border-white/10" />
          <p className="relative text-[0.68rem] font-black tracking-[0.16em] text-[#f0c275] uppercase">
            Resultado individual
          </p>
          <div className="relative mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              {startup.name}
            </h1>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              {validated ? "Validado" : "Resultado parcial"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              {assessment.executionMode === "self_assessment"
                ? "Autodiagnóstico"
                : "Aplicação assistida"}
            </span>
          </div>
          <dl className="relative mt-6 grid gap-4 text-sm text-white/75 sm:grid-cols-3">
            <div>
              <dt className="text-[0.62rem] font-black tracking-widest uppercase">
                Campanha / ciclo
              </dt>
              <dd className="mt-1 font-bold text-white">
                {campaignName ?? assessment.cycleLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[0.62rem] font-black tracking-widest uppercase">
                Modelo
              </dt>
              <dd className="mt-1 font-bold text-white">
                {template.name} · {template.versionLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[0.62rem] font-black tracking-widest uppercase">
                Etapa da startup
              </dt>
              <dd className="mt-1 font-bold text-white">{startup.stage}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section
        aria-label="Indicadores principais"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
      >
        {[
          [
            BarChart3,
            assessment.executionMode === "self_assessment"
              ? "Declarado"
              : "Resultado técnico",
            score(assessment.selfScore),
            "pontos",
          ],
          [ShieldCheck, "Validado", score(assessment.validatedScore), "pontos"],
          [TrendingUp, "Gap médio", score(assessment.averageGap), "pontos"],
          [
            ClipboardList,
            "Evidências",
            score(assessment.evidenceCoverage),
            "%",
          ],
          [
            AlertTriangle,
            "Riscos ativos",
            String(activeTriggers.length),
            "gatilhos",
          ],
          [
            CheckCircle2,
            "Classificação",
            assessment.classificationCode ?? "—",
            "nível",
          ],
        ].map(([Icon, label, value, suffix]) => {
          const MetricIcon = Icon as typeof BarChart3;
          return (
            <article
              key={String(label)}
              className="dashboard-card rounded-[1.35rem] p-4"
            >
              <MetricIcon className="size-5 text-[#8b161d]" />
              <p className="mt-3 text-[0.62rem] font-black tracking-wider text-[#806f6b] uppercase">
                {String(label)}
              </p>
              <p className="mt-1 text-2xl font-black text-[#421014]">
                {String(value)}
              </p>
              <p className="text-[0.68rem] text-[#8a7772]">{String(suffix)}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <MessageSquareText className="size-5 text-[#7b161c]" />
          <h2 className="text-xl font-black text-[#481014]">
            Observações desta aplicação
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-[#806f6b]">
              Nenhuma observação registrada.
            </p>
          ) : (
            notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl border border-[#751118]/10 bg-[#fcf9f6] p-4"
              >
                <time className="text-xs font-bold text-[#8b7773]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(note.created_at))}
                </time>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#655451]">
                  {note.body}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DiagnosticRadarChart dimensions={dimensions} />
        <DiagnosticDimensionBarChart dimensions={dimensions} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
          <p className="text-[0.64rem] font-black tracking-[0.14em] text-[#9a2930] uppercase">
            Leitura técnica
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#481014]">
            Como interpretar este ciclo
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#6d5b57]">
            O radar evidencia equilíbrio ou concentração entre dimensões. As
            barras mostram a diferença entre a percepção declarada e o valor
            validado pela incubadora. Use os gatilhos como prioridade de
            acompanhamento, não como substituto da análise do avaliador.
          </p>
        </section>
        <aside className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
          <p className="text-[0.64rem] font-black tracking-[0.14em] text-[#9a2930] uppercase">
            Prioridades
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#481014]">
            Gatilhos ativos
          </h2>
          <div className="mt-5 space-y-3">
            {activeTriggers.map((trigger) => (
              <article
                key={trigger.id}
                className="rounded-2xl border border-[#b4282f]/12 bg-[#fff5f2] p-4"
              >
                <span className="text-[0.62rem] font-black tracking-wider text-[#a12930] uppercase">
                  {severityLabel[trigger.severity]}
                </span>
                <h3 className="mt-1 font-black text-[#571217]">
                  {trigger.name}
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#78635f]">
                  {trigger.message}
                </p>
                {trigger.recommendedAction && (
                  <p className="mt-3 border-t border-[#8b161d]/10 pt-3 text-xs leading-5 font-bold text-[#6d171c]">
                    {trigger.recommendedAction}
                  </p>
                )}
              </article>
            ))}
            {activeTriggers.length === 0 && (
              <div className="rounded-2xl bg-[#edf7ef] p-4 text-sm font-bold text-[#347044]">
                Nenhum gatilho crítico ativo neste ciclo.
              </div>
            )}
          </div>
        </aside>
      </div>

      <section className="dashboard-card flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#f7e4d8] text-[#8b161d]">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h2 className="font-black text-[#481014]">Evolução entre ciclos</h2>
            <p className="text-sm text-[#806f6b]">
              Compare este resultado com avaliações anteriores.
            </p>
          </div>
        </div>
        <Link
          href={`${base}/startups/${startup.id}/historico`}
          className="inline-flex items-center gap-2 text-sm font-black text-[#8b161d]"
        >
          Abrir histórico <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}

export function DiagnosticHistory({
  base,
  startup,
  cycles,
  dimensionNames,
  families,
  activeFamily,
}: {
  base: string;
  startup: { id: string; name: string };
  cycles: {
    id: string;
    label: string;
    date: string;
    version: string;
    status: string;
    executionMode: "self_assessment" | "facilitated";
    selfScore: number | null;
    validatedScore: number | null;
    classification: string | null;
    gap: number | null;
    coverage: number | null;
    dimensions: Record<string, number | null>;
  }[];
  dimensionNames: { id: string; code: string | null; name: string }[];
  families: { id: string; name: string }[];
  activeFamily: string | null;
}) {
  return (
    <div className="page-enter space-y-6">
      <Link
        href={`${base}`}
        className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
      >
        <ArrowLeft className="size-4" /> Voltar aos diagnósticos
      </Link>
      <header>
        <p className="text-[0.68rem] font-black tracking-[0.16em] text-[#a12930] uppercase">
          Histórico e evolução
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#3f090d]">
          {startup.name}
        </h1>
        <p className="mt-3 text-sm text-[#806f6b]">
          Série ilimitada de ciclos preservados e resultados oficiais.
        </p>
      </header>

      {families.length > 1 && (
        <nav aria-label="Modelo comparado" className="flex flex-wrap gap-2">
          {families.map((family) => (
            <Link
              key={family.id}
              href={`${base}/startups/${startup.id}/historico?family=${family.id}`}
              className={
                family.id === activeFamily
                  ? "rounded-full bg-[#7b1118] px-4 py-2 text-xs font-black text-white"
                  : "rounded-full border border-[#751118]/15 bg-white px-4 py-2 text-xs font-black text-[#7b161c]"
              }
            >
              {family.name}
            </Link>
          ))}
        </nav>
      )}

      <DiagnosticEvolutionChart cycles={cycles} />

      <section className="dashboard-card overflow-hidden rounded-[1.6rem]">
        <div className="border-b border-[#751118]/8 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-black text-[#481014]">
            Comparativo de ciclos
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-sm">
            <thead className="bg-[#fcf8f5] text-left text-[0.64rem] tracking-[0.1em] text-[#7c6662] uppercase">
              <tr>
                <th className="px-6 py-4">Ciclo</th>
                <th className="px-4 py-4">Data</th>
                <th className="px-4 py-4">Versão</th>
                <th className="px-4 py-4">Modo</th>
                <th className="px-4 py-4">Declarado</th>
                <th className="px-4 py-4">Validado</th>
                <th className="px-4 py-4">Classificação</th>
                <th className="px-4 py-4">Gap</th>
                <th className="px-4 py-4">Evidências</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#751118]/8">
              {cycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td className="px-6 py-4 font-black text-[#481014]">
                    {cycle.label}
                  </td>
                  <td className="px-4 py-4 text-[#6f5d59]">
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(cycle.date),
                    )}
                  </td>
                  <td className="px-4 py-4">{cycle.version}</td>
                  <td className="px-4 py-4">
                    {cycle.executionMode === "self_assessment"
                      ? "Autodiagnóstico"
                      : "Assistido"}
                  </td>
                  <td className="px-4 py-4 font-black text-[#7a171d]">
                    {score(cycle.selfScore)}
                  </td>
                  <td className="px-4 py-4 font-black text-[#347044]">
                    {score(cycle.validatedScore)}
                  </td>
                  <td className="px-4 py-4">{cycle.classification ?? "—"}</td>
                  <td className="px-4 py-4">{score(cycle.gap)}</td>
                  <td className="px-4 py-4">{score(cycle.coverage)}%</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`${base}/startups/${startup.id}/avaliacoes/${cycle.id}`}
                      className="font-black text-[#8b161d]"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cycles.length === 0 && (
          <p className="p-8 text-center text-sm text-[#806f6b]">
            Ainda não existem ciclos para comparar.
          </p>
        )}
      </section>

      <section className="dashboard-card overflow-hidden rounded-[1.6rem]">
        <div className="border-b border-[#751118]/8 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-black text-[#481014]">
            Evolução por dimensão
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="bg-[#fcf8f5] text-left text-[0.64rem] tracking-[0.1em] text-[#7c6662] uppercase">
              <tr>
                <th className="px-6 py-4">Dimensão</th>
                {cycles.map((cycle) => (
                  <th key={cycle.id} className="px-4 py-4 text-center">
                    {cycle.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#751118]/8">
              {dimensionNames.map((dimension) => (
                <tr key={dimension.id}>
                  <td className="px-6 py-4 font-black text-[#481014]">
                    {dimension.code} · {dimension.name}
                  </td>
                  {cycles.map((cycle) => (
                    <td
                      key={cycle.id}
                      className="px-4 py-4 text-center font-black text-[#347044]"
                    >
                      {score(cycle.dimensions[dimension.id] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
