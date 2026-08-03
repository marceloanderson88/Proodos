import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { publishDiagnosticTemplateAction } from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { SubmitButton } from "@/components/m6/form-controls";
import type { Database } from "@/lib/supabase/database.types";

type Template = Database["public"]["Tables"]["diagnostic_templates"]["Row"];
type Dimension = Database["public"]["Tables"]["diagnostic_dimensions"]["Row"];
type Criterion = Database["public"]["Tables"]["diagnostic_criteria"]["Row"];
type Level = Database["public"]["Tables"]["diagnostic_criterion_levels"]["Row"];
type Classification =
  Database["public"]["Tables"]["diagnostic_classification_ranges"]["Row"];
type Indicator =
  Database["public"]["Tables"]["diagnostic_indicator_definitions"]["Row"];
type Rule = Database["public"]["Tables"]["diagnostic_trigger_rules"]["Row"];

export function DiagnosticModelDetail({
  organizationSlug,
  incubatorSlug,
  template,
  dimensions,
  criteria,
  levels,
  classifications,
  indicators,
  rules,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  template: Template;
  dimensions: Dimension[];
  criteria: Criterion[];
  levels: Level[];
  classifications: Classification[];
  indicators: Indicator[];
  rules: Rule[];
  success?: string;
  error?: string;
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const publish = publishDiagnosticTemplateAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const weightTotal = dimensions.reduce(
    (total, dimension) => total + Number(dimension.weight),
    0,
  );
  const completeRubrics = criteria.filter(
    (criterion) =>
      levels.filter((level) => level.criterion_id === criterion.id).length ===
      5,
  ).length;
  const isReady =
    dimensions.length > 0 &&
    weightTotal === 100 &&
    criteria.length > 0 &&
    completeRubrics === criteria.length &&
    classifications.length === 5;

  return (
    <div className="page-enter space-y-6">
      <Link
        href={base}
        className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
      >
        <ArrowLeft className="size-4" /> Voltar à biblioteca
      </Link>
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#3f090d]">
              {template.name}
            </h1>
            <span className="rounded-full bg-[#f3e8e2] px-3 py-1 text-xs font-black text-[#6f201f]">
              v{template.version_label ?? template.version}
            </span>
            <span
              className={
                template.status === "published"
                  ? "rounded-full bg-[#e8f5e9] px-3 py-1 text-xs font-black text-[#28713c]"
                  : "rounded-full bg-[#fff0dd] px-3 py-1 text-xs font-black text-[#8a5216]"
              }
            >
              {template.status === "published" ? "Publicado" : "Rascunho"}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#806f6b]">
            {template.description || "Sem descrição."}
          </p>
        </div>
        {template.status === "draft" && (
          <form action={publish}>
            <input type="hidden" name="templateId" value={template.id} />
            <SubmitButton disabled={!isReady}>
              <Send className="size-4" /> Publicar versão
            </SubmitButton>
          </form>
        )}
      </header>
      <FeedbackBanner success={success} error={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            ClipboardList,
            "Dimensões",
            dimensions.length,
            `${weightTotal}% do peso`,
          ],
          [
            CheckCircle2,
            "Critérios",
            criteria.length,
            `${completeRubrics} com rubrica completa`,
          ],
          [
            BarChart3,
            "Indicadores",
            indicators.length,
            "Financeiros, tração e impacto",
          ],
          [AlertTriangle, "Gatilhos", rules.length, "Alertas configurados"],
        ].map(([Icon, label, value, hint]) => {
          const CardIcon = Icon as typeof ClipboardList;
          return (
            <article
              key={String(label)}
              className="dashboard-card rounded-[1.4rem] p-5"
            >
              <CardIcon className="size-5 text-[#8f1720]" />
              <p className="mt-4 text-[0.65rem] font-black tracking-[0.11em] text-[#8a7470] uppercase">
                {String(label)}
              </p>
              <p className="text-3xl font-black text-[#3f090d]">
                {String(value)}
              </p>
              <p className="mt-1 text-xs text-[#8b7773]">{String(hint)}</p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.65fr]">
        <section className="space-y-4">
          {dimensions.map((dimension) => {
            const dimensionCriteria = criteria.filter(
              (criterion) => criterion.dimension_id === dimension.id,
            );
            return (
              <article
                key={dimension.id}
                className="dashboard-card overflow-hidden rounded-[1.6rem]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#751118]/8 bg-[#fcf7f3] px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[0.64rem] font-black tracking-[0.13em] text-[#9a2930] uppercase">
                      {dimension.code ?? "Sem código"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#481014]">
                      {dimension.name}
                    </h2>
                    {dimension.description && (
                      <p className="mt-2 max-w-2xl text-sm text-[#806f6b]">
                        {dimension.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {dimension.is_essential && (
                      <span className="rounded-full bg-[#f9e8dc] px-3 py-1 text-[0.64rem] font-black text-[#7b201e]">
                        Essencial
                      </span>
                    )}
                    <span className="rounded-full bg-white px-3 py-1 text-[0.64rem] font-black text-[#65524f]">
                      Peso {Number(dimension.weight)}%
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[#751118]/8">
                  {dimensionCriteria.map((criterion) => {
                    const rubric = levels.filter(
                      (level) => level.criterion_id === criterion.id,
                    );
                    return (
                      <details
                        key={criterion.id}
                        className="group px-5 py-4 sm:px-6"
                      >
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-black text-[#a02a30]">
                              {criterion.code ?? "—"}
                            </p>
                            <h3 className="mt-1 font-black text-[#481014]">
                              {criterion.prompt}
                            </h3>
                            {criterion.help_text && (
                              <p className="mt-1 text-xs leading-5 text-[#806f6b]">
                                {criterion.help_text}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-[#f5eee9] px-2.5 py-1 text-[0.62rem] font-black text-[#695754]">
                            {rubric.length}/5 níveis
                          </span>
                        </summary>
                        <ol className="mt-4 grid gap-2 border-t border-[#751118]/8 pt-4">
                          {rubric.map((level) => (
                            <li
                              key={level.id}
                              className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-xl bg-[#fcf8f5] p-3 text-sm"
                            >
                              <span className="grid size-8 place-items-center rounded-lg bg-[#f6e2d3] font-black text-[#7a151b]">
                                {Number(level.score)}
                              </span>
                              <div>
                                <strong className="text-[#4a1719]">
                                  {level.label}
                                </strong>
                                <p className="mt-0.5 text-[#786663]">
                                  {level.description}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </details>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="dashboard-card rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#27713d]" />
              <h2 className="font-black text-[#481014]">
                Validação da estrutura
              </h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[#685653]">
              {[
                [dimensions.length > 0, "Ao menos uma dimensão"],
                [weightTotal === 100, "Pesos somam 100%"],
                [criteria.length > 0, "Critérios configurados"],
                [
                  completeRubrics === criteria.length && criteria.length > 0,
                  "Rubricas completas de 0 a 4",
                ],
                [classifications.length === 5, "Cinco faixas de classificação"],
              ].map(([ok, label]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <span
                    className={
                      ok
                        ? "size-2 rounded-full bg-[#3aa15a]"
                        : "size-2 rounded-full bg-[#d78318]"
                    }
                  />
                  {String(label)}
                </li>
              ))}
            </ul>
          </section>
          <section className="dashboard-card rounded-[1.5rem] p-5">
            <h2 className="font-black text-[#481014]">Classificações</h2>
            <div className="mt-4 space-y-2">
              {classifications.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-[#fcf8f5] px-3 py-2 text-sm"
                >
                  <strong className="text-[#4d1a1c]">{item.label}</strong>
                  <span className="text-[#7d6a67]">
                    {Number(item.minimum_score)}–{Number(item.maximum_score)}
                  </span>
                </div>
              ))}
            </div>
          </section>
          {template.status === "published" && (
            <div className="rounded-[1.4rem] border border-[#a6d5b1] bg-[#eff9f1] p-5 text-sm leading-6 text-[#2d613a]">
              Esta versão é imutável. Alterações futuras devem gerar uma nova
              versão, preservando campanhas e resultados históricos.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
