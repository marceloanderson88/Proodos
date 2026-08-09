import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CopyPlus,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import {
  addDiagnosticCriterionAction,
  addDiagnosticDimensionAction,
  deleteDiagnosticCriterionAction,
  deleteDiagnosticDimensionAction,
  deleteDiagnosticTemplateAction,
  duplicateDiagnosticTemplateAction,
  publishDiagnosticTemplateAction,
  reorderDiagnosticCriteriaAction,
  reorderDiagnosticDimensionsAction,
  updateDiagnosticCriterionAction,
  updateDiagnosticDimensionAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
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

function moveId(ids: string[], index: number, offset: -1 | 1) {
  const next = [...ids];
  const target = index + offset;
  if (target < 0 || target >= next.length) return next;
  const currentId = next[index];
  const targetId = next[target];
  if (!currentId || !targetId) return next;
  next[index] = targetId;
  next[target] = currentId;
  return next;
}

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
  canDelete,
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
  canDelete: boolean;
  success?: string;
  error?: string;
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const publish = publishDiagnosticTemplateAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const addDimension = addDiagnosticDimensionAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const addCriterion = addDiagnosticCriterionAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const duplicate = duplicateDiagnosticTemplateAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const deleteTemplate = deleteDiagnosticTemplateAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const updateDimension = updateDiagnosticDimensionAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const deleteDimension = deleteDiagnosticDimensionAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const reorderDimensions = reorderDiagnosticDimensionsAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const updateCriterion = updateDiagnosticCriterionAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const deleteCriterion = deleteDiagnosticCriterionAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const reorderCriteria = reorderDiagnosticCriteriaAction.bind(
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
        <div className="flex flex-wrap gap-3">
          {template.status === "draft" && (
            <form action={publish}>
              <input type="hidden" name="templateId" value={template.id} />
              <SubmitButton disabled={!isReady}>
                <Send className="size-4" /> Publicar versão
              </SubmitButton>
            </form>
          )}
          {template.status === "published" && (
            <form action={duplicate} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="templateId" value={template.id} />
              <label className="grid gap-1 text-xs font-black text-[#5e4542]">
                Rótulo da nova versão
                <input
                  name="versionLabel"
                  placeholder="Automático"
                  className={`${inputClassName} min-w-40`}
                />
              </label>
              <label className="grid gap-1 text-xs font-black text-[#5e4542]">
                Motivo da revisão
                <input
                  name="changelog"
                  placeholder="Ex.: ajustes de critérios"
                  className={`${inputClassName} min-w-56`}
                />
              </label>
              <SubmitButton>
                <CopyPlus className="size-4" /> Criar nova versão
              </SubmitButton>
            </form>
          )}
          {canDelete ? (
            <form action={deleteTemplate}>
              <input type="hidden" name="templateId" value={template.id} />
              <ConfirmSubmitButton
                message={`Excluir definitivamente o modelo “${template.name}”? Como ele ainda não foi usado, sua estrutura também será removida.`}
              >
                <Trash2 className="size-4" /> Excluir modelo
              </ConfirmSubmitButton>
            </form>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-xl border border-[#751118]/10 bg-[#f7f2ee] px-4 text-xs font-bold text-[#806f6b]">
              Modelo utilizado · exclusão bloqueada
            </span>
          )}
        </div>
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

      {template.status === "draft" && (
        <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <form
            action={addDimension}
            className="dashboard-card rounded-[1.6rem] p-6"
          >
            <input type="hidden" name="templateId" value={template.id} />
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#f7e2d4] text-[#8a141b]">
                <Plus className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-[#481014]">
                  Nova dimensão
                </h2>
                <p className="mt-1 text-sm text-[#806f6b]">
                  Organize o diagnóstico em eixos que, juntos, somem 100%.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field label="Código" name="dimension-code">
                <input
                  id="dimension-code"
                  name="code"
                  placeholder="D1"
                  required
                  className={inputClassName}
                />
              </Field>
              <Field label="Nome" name="dimension-name">
                <input
                  id="dimension-name"
                  name="name"
                  placeholder="Estratégia e mercado"
                  required
                  className={inputClassName}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Descrição" name="dimension-description">
                <textarea
                  id="dimension-description"
                  name="description"
                  rows={3}
                  className={inputClassName}
                />
              </Field>
              <Field label="Peso (%)" name="dimension-weight">
                <input
                  id="dimension-weight"
                  name="weight"
                  type="number"
                  min="0.001"
                  max="100"
                  step="0.001"
                  required
                  className={inputClassName}
                />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm font-bold text-[#5e4542]">
              <input
                type="checkbox"
                name="isEssential"
                className="size-4 accent-[#8a141b]"
              />
              Dimensão essencial para a leitura de maturidade
            </label>
            <div className="mt-5 flex justify-end">
              <SubmitButton>Adicionar dimensão</SubmitButton>
            </div>
          </form>

          <form
            action={addCriterion}
            className="dashboard-card rounded-[1.6rem] p-6"
          >
            <input type="hidden" name="templateId" value={template.id} />
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#f7e2d4] text-[#8a141b]">
                <ClipboardList className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-[#481014]">
                  Novo critério
                </h2>
                <p className="mt-1 text-sm text-[#806f6b]">
                  Cada critério usa a escala de maturidade de 0 a 4 com rubrica
                  explícita.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_8rem_7rem]">
              <Field label="Dimensão" name="criterion-dimension">
                <select
                  id="criterion-dimension"
                  name="dimensionId"
                  required
                  className={inputClassName}
                >
                  <option value="">Selecione</option>
                  {dimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.code} · {dimension.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Código" name="criterion-code">
                <input
                  id="criterion-code"
                  name="code"
                  placeholder="EM1"
                  required
                  className={inputClassName}
                />
              </Field>
              <Field label="Peso" name="criterion-weight">
                <input
                  id="criterion-weight"
                  name="weight"
                  type="number"
                  min="0.001"
                  step="0.001"
                  defaultValue="1"
                  required
                  className={inputClassName}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Pergunta / critério" name="criterion-prompt">
                <input
                  id="criterion-prompt"
                  name="prompt"
                  required
                  className={inputClassName}
                />
              </Field>
              <Field label="Ajuda ao respondente" name="criterion-help">
                <textarea
                  id="criterion-help"
                  name="helpText"
                  rows={2}
                  className={inputClassName}
                />
              </Field>
            </div>
            <fieldset className="mt-5 rounded-2xl border border-[#751118]/10 bg-[#fcf8f5] p-4">
              <legend className="px-2 text-sm font-black text-[#481014]">
                Rubrica de maturidade
              </legend>
              <div className="grid gap-3">
                {[
                  "Inexistente",
                  "Iniciado",
                  "Estruturado",
                  "Validado",
                  "Sistematizado",
                ].map((label, score) => (
                  <label
                    key={label}
                    className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-center"
                  >
                    <span className="text-xs font-black text-[#6f201f]">
                      {score} · {label}
                    </span>
                    <input
                      name={`rubric${score}`}
                      required
                      placeholder={`Descreva o que caracteriza o nível ${score}`}
                      className={inputClassName}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm font-bold text-[#5e4542]">
                <input
                  type="checkbox"
                  name="allowsNotApplicable"
                  className="size-4 accent-[#8a141b]"
                />
                Permitir “não se aplica”
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-[#5e4542]">
                <input
                  type="checkbox"
                  name="requiresNotApplicableJustification"
                  defaultChecked
                  className="size-4 accent-[#8a141b]"
                />
                Exigir justificativa para N/A
              </label>
              <Field
                label="Evidência obrigatória a partir da nota"
                name="criterion-evidence"
              >
                <select
                  id="criterion-evidence"
                  name="evidenceRequiredFrom"
                  className={inputClassName}
                >
                  <option value="">Não exigir</option>
                  <option value="0">0 ou superior</option>
                  <option value="1">1 ou superior</option>
                  <option value="2">2 ou superior</option>
                  <option value="3">3 ou superior</option>
                  <option value="4">Somente nota 4</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <SubmitButton disabled={dimensions.length === 0}>
                Adicionar critério
              </SubmitButton>
            </div>
          </form>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.65fr]">
        <section className="space-y-4">
          {dimensions.map((dimension, dimensionIndex) => {
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
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {dimension.is_essential && (
                      <span className="rounded-full bg-[#f9e8dc] px-3 py-1 text-[0.64rem] font-black text-[#7b201e]">
                        Essencial
                      </span>
                    )}
                    <span className="rounded-full bg-white px-3 py-1 text-[0.64rem] font-black text-[#65524f]">
                      Peso {Number(dimension.weight)}%
                    </span>
                    {template.status === "draft" && dimensions.length > 1 && (
                      <>
                        {([-1, 1] as const).map((offset) => {
                          const disabled =
                            dimensionIndex + offset < 0 ||
                            dimensionIndex + offset >= dimensions.length;
                          const orderedIds = moveId(
                            dimensions.map((item) => item.id),
                            dimensionIndex,
                            offset,
                          );
                          return (
                            <form action={reorderDimensions} key={offset}>
                              <input
                                type="hidden"
                                name="templateId"
                                value={template.id}
                              />
                              {orderedIds.map((id) => (
                                <input
                                  key={id}
                                  type="hidden"
                                  name="dimensionIds"
                                  value={id}
                                />
                              ))}
                              <button
                                type="submit"
                                disabled={disabled}
                                aria-label={
                                  offset === -1
                                    ? `Mover ${dimension.name} para cima`
                                    : `Mover ${dimension.name} para baixo`
                                }
                                className="grid size-9 place-items-center rounded-xl border border-[#7b161c]/15 bg-white text-[#7b161c] transition hover:bg-[#f7e7de] disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                {offset === -1 ? (
                                  <ArrowUp className="size-4" />
                                ) : (
                                  <ArrowDown className="size-4" />
                                )}
                              </button>
                            </form>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
                {template.status === "draft" && (
                  <details className="border-b border-[#751118]/8 bg-white px-5 py-4 sm:px-6">
                    <summary className="cursor-pointer text-sm font-black text-[#7b161c]">
                      Editar dimensão
                    </summary>
                    <form action={updateDimension} className="mt-4 grid gap-4">
                      <input
                        type="hidden"
                        name="templateId"
                        value={template.id}
                      />
                      <input
                        type="hidden"
                        name="dimensionId"
                        value={dimension.id}
                      />
                      <div className="grid gap-4 sm:grid-cols-[8rem_1fr_8rem]">
                        <Field
                          label="Código"
                          name={`dimension-code-${dimension.id}`}
                        >
                          <input
                            id={`dimension-code-${dimension.id}`}
                            name="code"
                            defaultValue={dimension.code ?? ""}
                            required
                            className={inputClassName}
                          />
                        </Field>
                        <Field
                          label="Nome"
                          name={`dimension-name-${dimension.id}`}
                        >
                          <input
                            id={`dimension-name-${dimension.id}`}
                            name="name"
                            defaultValue={dimension.name}
                            required
                            className={inputClassName}
                          />
                        </Field>
                        <Field
                          label="Peso (%)"
                          name={`dimension-weight-${dimension.id}`}
                        >
                          <input
                            id={`dimension-weight-${dimension.id}`}
                            name="weight"
                            type="number"
                            min="0.001"
                            max="100"
                            step="0.001"
                            defaultValue={Number(dimension.weight)}
                            required
                            className={inputClassName}
                          />
                        </Field>
                      </div>
                      <Field
                        label="Descrição"
                        name={`dimension-description-${dimension.id}`}
                      >
                        <textarea
                          id={`dimension-description-${dimension.id}`}
                          name="description"
                          rows={2}
                          defaultValue={dimension.description}
                          className={inputClassName}
                        />
                      </Field>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-3 text-sm font-bold text-[#5e4542]">
                          <input
                            type="checkbox"
                            name="isEssential"
                            defaultChecked={dimension.is_essential}
                            className="size-4 accent-[#8a141b]"
                          />
                          Dimensão essencial
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <SubmitButton>
                            <Save className="size-4" /> Salvar dimensão
                          </SubmitButton>
                        </div>
                      </div>
                    </form>
                    <form
                      action={deleteDimension}
                      className="mt-3 flex justify-end"
                    >
                      <input
                        type="hidden"
                        name="templateId"
                        value={template.id}
                      />
                      <input
                        type="hidden"
                        name="dimensionId"
                        value={dimension.id}
                      />
                      <ConfirmSubmitButton
                        message={`Excluir a dimensão “${dimension.name}” e todos os seus critérios?`}
                      >
                        <Trash2 className="size-4" /> Excluir dimensão
                      </ConfirmSubmitButton>
                    </form>
                  </details>
                )}
                <div className="divide-y divide-[#751118]/8">
                  {dimensionCriteria.map((criterion, criterionIndex) => {
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
                        {template.status === "draft" && (
                          <div className="mt-4 border-t border-[#751118]/8 pt-4">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-black tracking-[0.08em] text-[#8b6662] uppercase">
                                Editar critério e rubrica
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {dimensionCriteria.length > 1 &&
                                  ([-1, 1] as const).map((offset) => {
                                    const disabled =
                                      criterionIndex + offset < 0 ||
                                      criterionIndex + offset >=
                                        dimensionCriteria.length;
                                    const orderedIds = moveId(
                                      dimensionCriteria.map((item) => item.id),
                                      criterionIndex,
                                      offset,
                                    );
                                    return (
                                      <form
                                        action={reorderCriteria}
                                        key={offset}
                                      >
                                        <input
                                          type="hidden"
                                          name="templateId"
                                          value={template.id}
                                        />
                                        <input
                                          type="hidden"
                                          name="dimensionId"
                                          value={dimension.id}
                                        />
                                        {orderedIds.map((id) => (
                                          <input
                                            key={id}
                                            type="hidden"
                                            name="criterionIds"
                                            value={id}
                                          />
                                        ))}
                                        <button
                                          type="submit"
                                          disabled={disabled}
                                          aria-label={
                                            offset === -1
                                              ? `Mover ${criterion.code ?? "critério"} para cima`
                                              : `Mover ${criterion.code ?? "critério"} para baixo`
                                          }
                                          className="grid size-9 place-items-center rounded-xl border border-[#7b161c]/15 bg-white text-[#7b161c] transition hover:bg-[#f7e7de] disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                          {offset === -1 ? (
                                            <ArrowUp className="size-4" />
                                          ) : (
                                            <ArrowDown className="size-4" />
                                          )}
                                        </button>
                                      </form>
                                    );
                                  })}
                              </div>
                            </div>
                            <form
                              action={updateCriterion}
                              className="grid gap-4"
                            >
                              <input
                                type="hidden"
                                name="templateId"
                                value={template.id}
                              />
                              <input
                                type="hidden"
                                name="dimensionId"
                                value={dimension.id}
                              />
                              <input
                                type="hidden"
                                name="criterionId"
                                value={criterion.id}
                              />
                              <div className="grid gap-4 sm:grid-cols-[8rem_1fr_7rem]">
                                <Field
                                  label="Código"
                                  name={`criterion-code-${criterion.id}`}
                                >
                                  <input
                                    id={`criterion-code-${criterion.id}`}
                                    name="code"
                                    defaultValue={criterion.code ?? ""}
                                    required
                                    className={inputClassName}
                                  />
                                </Field>
                                <Field
                                  label="Pergunta / critério"
                                  name={`criterion-prompt-${criterion.id}`}
                                >
                                  <input
                                    id={`criterion-prompt-${criterion.id}`}
                                    name="prompt"
                                    defaultValue={criterion.prompt}
                                    required
                                    className={inputClassName}
                                  />
                                </Field>
                                <Field
                                  label="Peso"
                                  name={`criterion-weight-${criterion.id}`}
                                >
                                  <input
                                    id={`criterion-weight-${criterion.id}`}
                                    name="weight"
                                    type="number"
                                    min="0.001"
                                    max="100"
                                    step="0.001"
                                    defaultValue={Number(criterion.weight)}
                                    required
                                    className={inputClassName}
                                  />
                                </Field>
                              </div>
                              <Field
                                label="Ajuda ao respondente"
                                name={`criterion-help-${criterion.id}`}
                              >
                                <textarea
                                  id={`criterion-help-${criterion.id}`}
                                  name="helpText"
                                  rows={2}
                                  defaultValue={criterion.help_text}
                                  className={inputClassName}
                                />
                              </Field>
                              <fieldset className="rounded-2xl border border-[#751118]/10 bg-[#fcf8f5] p-4">
                                <legend className="px-2 text-sm font-black text-[#481014]">
                                  Rubrica de maturidade
                                </legend>
                                <div className="grid gap-3">
                                  {rubric.map((level) => (
                                    <label
                                      key={level.id}
                                      className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-center"
                                    >
                                      <span className="text-xs font-black text-[#6f201f]">
                                        {Number(level.score)} · {level.label}
                                      </span>
                                      <input
                                        name={`rubric${Number(level.score)}`}
                                        defaultValue={level.description}
                                        required
                                        className={inputClassName}
                                      />
                                    </label>
                                  ))}
                                </div>
                              </fieldset>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex items-center gap-3 text-sm font-bold text-[#5e4542]">
                                  <input
                                    type="checkbox"
                                    name="allowsNotApplicable"
                                    defaultChecked={
                                      criterion.allows_not_applicable
                                    }
                                    className="size-4 accent-[#8a141b]"
                                  />
                                  Permitir “não se aplica”
                                </label>
                                <label className="flex items-center gap-3 text-sm font-bold text-[#5e4542]">
                                  <input
                                    type="checkbox"
                                    name="requiresNotApplicableJustification"
                                    defaultChecked={
                                      criterion.requires_not_applicable_justification
                                    }
                                    className="size-4 accent-[#8a141b]"
                                  />
                                  Exigir justificativa para N/A
                                </label>
                                <Field
                                  label="Evidência obrigatória a partir da nota"
                                  name={`criterion-evidence-${criterion.id}`}
                                >
                                  <select
                                    id={`criterion-evidence-${criterion.id}`}
                                    name="evidenceRequiredFrom"
                                    defaultValue={
                                      criterion.evidence_required_from === null
                                        ? ""
                                        : String(
                                            Number(
                                              criterion.evidence_required_from,
                                            ),
                                          )
                                    }
                                    className={inputClassName}
                                  >
                                    <option value="">Não exigir</option>
                                    {[0, 1, 2, 3, 4].map((score) => (
                                      <option key={score} value={score}>
                                        {score} ou superior
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                <SubmitButton>
                                  <Save className="size-4" /> Salvar critério
                                </SubmitButton>
                              </div>
                            </form>
                            <form
                              action={deleteCriterion}
                              className="mt-3 flex justify-end"
                            >
                              <input
                                type="hidden"
                                name="templateId"
                                value={template.id}
                              />
                              <input
                                type="hidden"
                                name="criterionId"
                                value={criterion.id}
                              />
                              <ConfirmSubmitButton
                                message={`Excluir o critério “${criterion.code ?? criterion.prompt}”?`}
                              >
                                <Trash2 className="size-4" /> Excluir critério
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        )}
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
