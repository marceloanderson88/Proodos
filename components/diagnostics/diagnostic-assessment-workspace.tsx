import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  ClipboardCheck,
  ExternalLink,
  FileText,
  MailPlus,
  ShieldCheck,
  UserCheck,
  UserRoundPlus,
  X,
} from "lucide-react";
import Link from "next/link";

import {
  addDiagnosticExternalEvidenceAction,
  assignDiagnosticEvaluatorAction,
  assignDiagnosticRespondentAction,
  deleteDiagnosticEvidenceAction,
  finalizeDiagnosticAssessmentAction,
  inviteDiagnosticRespondentAction,
  reopenDiagnosticAssessmentAction,
  submitDiagnosticAssessmentAction,
  revokeDiagnosticRespondentAction,
  validateDiagnosticResponseAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";
import {
  DiagnosticAutosaveProvider,
  DiagnosticIndicatorForm,
  DiagnosticResponseAutosaveForm,
} from "@/components/diagnostics/diagnostic-autosave";
import type { Database, Json } from "@/lib/supabase/database.types";

type Assessment = Database["public"]["Tables"]["diagnostic_assessments"]["Row"];
type Template = Database["public"]["Tables"]["diagnostic_templates"]["Row"];
type Dimension = Database["public"]["Tables"]["diagnostic_dimensions"]["Row"];
type Criterion = Database["public"]["Tables"]["diagnostic_criteria"]["Row"];
type Level = Database["public"]["Tables"]["diagnostic_criterion_levels"]["Row"];
type Response = Database["public"]["Tables"]["diagnostic_responses"]["Row"];
type DimensionScore =
  Database["public"]["Tables"]["diagnostic_dimension_scores"]["Row"];
type TriggerResult =
  Database["public"]["Tables"]["diagnostic_trigger_results"]["Row"];
type TriggerRule =
  Database["public"]["Tables"]["diagnostic_trigger_rules"]["Row"];
type Respondent = Database["public"]["Tables"]["diagnostic_respondents"]["Row"];
type Evidence =
  Database["public"]["Tables"]["diagnostic_response_evidence"]["Row"];
type IndicatorDefinition =
  Database["public"]["Tables"]["diagnostic_indicator_definitions"]["Row"];
type IndicatorValue =
  Database["public"]["Tables"]["diagnostic_indicator_values"]["Row"];

function scalar(value: Json | null) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function DiagnosticAssessmentWorkspace({
  organizationSlug,
  incubatorSlug,
  assessment,
  template,
  startup,
  dimensions,
  criteria,
  levels,
  responses,
  scores,
  triggerResults,
  triggerRules,
  respondents,
  people,
  evidence,
  indicatorDefinitions,
  indicatorValues,
  respondentInvitationRoles,
  pendingRespondentInvitations,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  assessment: Assessment;
  template: Template;
  startup: { id: string; name: string; stage: string };
  dimensions: Dimension[];
  criteria: Criterion[];
  levels: Level[];
  responses: Response[];
  scores: DimensionScore[];
  triggerResults: TriggerResult[];
  triggerRules: TriggerRule[];
  respondents: Respondent[];
  people: {
    id: string;
    display_name: string | null;
    email: string | null;
  }[];
  evidence: Evidence[];
  indicatorDefinitions: IndicatorDefinition[];
  indicatorValues: IndicatorValue[];
  respondentInvitationRoles: { id: string; name: string }[];
  pendingRespondentInvitations: {
    id: string;
    email: string;
    invited_name: string | null;
    status: string;
    expires_at: string;
    respondentRole: "primary" | "collaborator" | "viewer";
  }[];
  success?: string;
  error?: string;
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const currentPath = `${base}/avaliacoes/${assessment.id}`;
  const validateResponse = validateDiagnosticResponseAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const submitAssessment = submitDiagnosticAssessmentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const reopenAssessment = reopenDiagnosticAssessmentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const finalizeAssessment = finalizeDiagnosticAssessmentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const assignRespondent = assignDiagnosticRespondentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const revokeRespondent = revokeDiagnosticRespondentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const inviteRespondent = inviteDiagnosticRespondentAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const assignEvaluator = assignDiagnosticEvaluatorAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const addExternalEvidence = addDiagnosticExternalEvidenceAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const deleteEvidence = deleteDiagnosticEvidenceAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );
  const personName = (userId: string) => {
    const person = people.find((item) => item.id === userId);
    return person?.display_name || person?.email || "Pessoa sem nome";
  };
  const answered = responses.filter(
    (response) => response.self_value !== null || response.is_not_applicable,
  ).length;
  const validated = responses.filter(
    (response) => response.validated_value !== null,
  ).length;
  const progress =
    criteria.length === 0 ? 0 : Math.round((answered / criteria.length) * 100);
  const activeTriggers = triggerResults.filter(
    (result) => result.status === "triggered",
  );
  const canRespond = ["draft", "in_progress"].includes(assessment.status);
  const canValidate = ["submitted", "under_review"].includes(assessment.status);
  const canSubmit = criteria.length > 0 && answered === criteria.length;
  const canFinalize = criteria.length > 0 && validated === criteria.length;

  return (
    <div className="page-enter space-y-6">
      <Link
        href={
          assessment.campaign_id
            ? `${base}/campanhas/${assessment.campaign_id}`
            : base
        }
        className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#3f090d]">
              {startup.name}
            </h1>
            <span className="rounded-full bg-[#f2e8e3] px-3 py-1 text-xs font-black text-[#6f201f]">
              {assessment.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-3 text-sm text-[#806f6b]">
            {template.name} · v{template.version_label ?? template.version} ·{" "}
            {assessment.cycle_label}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#fff0ea] px-5 py-3 text-center">
            <p className="text-[0.62rem] font-black text-[#8c6a64] uppercase">
              Autodeclarado
            </p>
            <p className="text-3xl font-black text-[#7a1018]">
              {assessment.self_score == null
                ? "—"
                : Number(assessment.self_score).toFixed(0)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#eaf6ec] px-5 py-3 text-center">
            <p className="text-[0.62rem] font-black text-[#53715b] uppercase">
              Validado
            </p>
            <p className="text-3xl font-black text-[#2e6e3d]">
              {assessment.validated_score == null
                ? "—"
                : Number(assessment.validated_score).toFixed(0)}
            </p>
          </div>
        </div>
      </header>
      <FeedbackBanner success={success} error={error} />

      <section className="dashboard-card flex flex-col gap-4 rounded-[1.5rem] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[0.65rem] font-black tracking-[0.12em] text-[#9a2930] uppercase">
            Fluxo da avaliação
          </p>
          <h2 className="mt-1 font-black text-[#481014]">
            {canRespond && "Preencha, revise e envie a autoavaliação."}
            {canValidate &&
              "A autoavaliação foi enviada e aguarda validação oficial."}
            {assessment.status === "validated" &&
              "Validação final concluída e preservada no histórico."}
            {assessment.status === "cancelled" &&
              "Esta avaliação foi cancelada."}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${base}/startups/${startup.id}/avaliacoes/${assessment.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#8b161d]/15 bg-white px-4 text-sm font-black text-[#7b161c] shadow-sm"
          >
            <BarChart3 className="size-4" /> Ver resultado
          </Link>
          {canRespond && (
            <form action={submitAssessment}>
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <input type="hidden" name="returnTo" value={currentPath} />
              <SubmitButton disabled={!canSubmit}>
                <ClipboardCheck className="size-4" /> Enviar para validação
              </SubmitButton>
            </form>
          )}
          {canValidate && (
            <>
              <form action={reopenAssessment}>
                <input
                  type="hidden"
                  name="assessmentId"
                  value={assessment.id}
                />
                <input type="hidden" name="returnTo" value={currentPath} />
                <SubmitButton>Reabrir para ajustes</SubmitButton>
              </form>
              <form action={finalizeAssessment}>
                <input
                  type="hidden"
                  name="assessmentId"
                  value={assessment.id}
                />
                <input type="hidden" name="returnTo" value={currentPath} />
                <SubmitButton disabled={!canFinalize}>
                  <BadgeCheck className="size-4" /> Concluir validação
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="dashboard-card rounded-[1.5rem] p-5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <strong className="text-[#481014]">
            Respondidos {answered} de {criteria.length} critérios
          </strong>
          <span className="font-black text-[#7b151c]">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee5df]">
          <div
            className="h-full rounded-full bg-[#8a141b] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
        <main className="space-y-5">
          <DiagnosticAutosaveProvider
            organizationSlug={organizationSlug}
            incubatorSlug={incubatorSlug}
            initialLockVersion={Number(assessment.lock_version)}
          >
            {indicatorDefinitions.length > 0 && (
              <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#a12930] uppercase">
                      Dados objetivos
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#481014]">
                      Indicadores da startup
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#806f6b]">
                      Registre valores mensuráveis e a origem da evidência. A
                      edição usa a mesma proteção contra alterações simultâneas
                      das respostas.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f4ebe5] px-3 py-1 text-xs font-black text-[#7b161c]">
                    {
                      indicatorValues.filter(
                        (item) =>
                          item.numeric_value !== null || item.is_not_applicable,
                      ).length
                    }
                    /
                    {
                      indicatorDefinitions.filter((item) => !item.is_derived)
                        .length
                    }{" "}
                    preenchidos
                  </span>
                </div>
                <div className="mt-5 space-y-6">
                  {[
                    ...new Set(
                      indicatorDefinitions.map((item) => item.category),
                    ),
                  ].map((category) => (
                    <div key={category}>
                      <h3 className="mb-3 text-sm font-black text-[#5a2022]">
                        {category}
                      </h3>
                      <div className="grid gap-3 2xl:grid-cols-2">
                        {indicatorDefinitions
                          .filter((item) => item.category === category)
                          .map((definition) => {
                            const indicatorValue = indicatorValues.find(
                              (item) =>
                                item.indicator_definition_id === definition.id,
                            );
                            if (definition.is_derived) {
                              return (
                                <article
                                  key={definition.id}
                                  className="rounded-2xl border border-dashed border-[#751118]/15 bg-[#fbf7f4] p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <h4 className="font-black text-[#481014]">
                                        {definition.name}
                                      </h4>
                                      <p className="mt-1 text-xs text-[#806f6b]">
                                        Unidade: {definition.unit}
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-black text-[#806f6b]">
                                      Calculado
                                    </span>
                                  </div>
                                  <p className="mt-4 text-sm font-bold text-[#6b5652]">
                                    {indicatorValue?.numeric_value == null
                                      ? "Aguardando os indicadores de origem."
                                      : `${Number(indicatorValue.numeric_value).toLocaleString("pt-BR")} ${definition.unit}`}
                                  </p>
                                </article>
                              );
                            }
                            return (
                              <DiagnosticIndicatorForm
                                key={definition.id}
                                assessmentId={assessment.id}
                                definition={{
                                  id: definition.id,
                                  name: definition.name,
                                  unit: definition.unit,
                                  valueType: definition.value_type,
                                  evidenceHint: definition.evidence_hint,
                                }}
                                indicatorValue={
                                  indicatorValue
                                    ? {
                                        numericValue:
                                          indicatorValue.numeric_value,
                                        targetValue:
                                          indicatorValue.target_value,
                                        isNotApplicable:
                                          indicatorValue.is_not_applicable,
                                        notApplicableJustification:
                                          indicatorValue.not_applicable_justification,
                                        evidenceNotes:
                                          indicatorValue.evidence_notes,
                                      }
                                    : null
                                }
                                canRespond={canRespond}
                              />
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {dimensions.map((dimension) => {
              const dimensionCriteria = criteria.filter(
                (criterion) => criterion.dimension_id === dimension.id,
              );
              const dimensionScore = scores.find(
                (score) => score.dimension_id === dimension.id,
              );
              return (
                <details
                  key={dimension.id}
                  open
                  className="dashboard-card overflow-hidden rounded-[1.6rem]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#fcf7f3] px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#a12930] uppercase">
                        {dimension.code}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[#481014]">
                        {dimension.name}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#7a171d]">
                        Auto{" "}
                        {dimensionScore?.self_score == null
                          ? "—"
                          : Number(dimensionScore.self_score).toFixed(0)}
                      </span>
                      <span className="rounded-full bg-[#e8f5e9] px-3 py-1 text-xs font-black text-[#28713c]">
                        Oficial{" "}
                        {dimensionScore?.validated_score == null
                          ? "—"
                          : Number(dimensionScore.validated_score).toFixed(0)}
                      </span>
                    </div>
                  </summary>
                  <div className="divide-y divide-[#751118]/8">
                    {dimensionCriteria.map((criterion) => {
                      const response = responses.find(
                        (item) => item.criterion_id === criterion.id,
                      );
                      const rubric = levels.filter(
                        (level) => level.criterion_id === criterion.id,
                      );
                      const responseEvidence = response
                        ? evidence.filter(
                            (item) => item.response_id === response.id,
                          )
                        : [];
                      return (
                        <article
                          key={criterion.id}
                          className="px-5 py-6 sm:px-6"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-[#a12930]">
                                {criterion.code}
                              </p>
                              <h3 className="mt-1 max-w-3xl text-lg font-black text-[#431014]">
                                {criterion.prompt}
                              </h3>
                              {criterion.help_text && (
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#806f6b]">
                                  {criterion.help_text}
                                </p>
                              )}
                            </div>
                            {response?.validated_at && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-3 py-1 text-xs font-black text-[#28713c]">
                                <BadgeCheck className="size-3.5" /> Validado
                              </span>
                            )}
                          </div>
                          <div className="mt-5 grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
                            <div className="rounded-2xl border border-[#751118]/8 bg-[#fcf9f6] p-4">
                              <DiagnosticResponseAutosaveForm
                                assessmentId={assessment.id}
                                criterion={{
                                  id: criterion.id,
                                  responseType: criterion.response_type,
                                  allowsNotApplicable:
                                    criterion.allows_not_applicable,
                                  requiresNaJustification:
                                    criterion.requires_not_applicable_justification,
                                }}
                                levels={rubric.map((level) => ({
                                  id: level.id,
                                  score: Number(level.score),
                                  label: level.label,
                                  description: level.description,
                                }))}
                                response={
                                  response
                                    ? {
                                        selfValue: response.self_value,
                                        isNotApplicable:
                                          response.is_not_applicable,
                                        notApplicableJustification:
                                          response.not_applicable_justification,
                                        selfComment: response.self_comment,
                                        evidenceNotes: response.evidence_notes,
                                      }
                                    : null
                                }
                                canRespond={canRespond}
                              />
                              <div className="mt-5 border-t border-[#751118]/8 pt-4">
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="size-4 text-[#8b161d]" />
                                  <h4 className="text-sm font-black text-[#481014]">
                                    Evidências vinculadas
                                  </h4>
                                </div>
                                {responseEvidence.length > 0 && (
                                  <ul className="mt-3 space-y-2">
                                    {responseEvidence.map((item) => (
                                      <li
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-xs"
                                      >
                                        <a
                                          href={item.external_url ?? "#"}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="min-w-0 truncate font-bold text-[#7b161c] underline decoration-[#7b161c]/30 underline-offset-4"
                                        >
                                          {item.label}
                                        </a>
                                        {canRespond && (
                                          <form action={deleteEvidence}>
                                            <input
                                              type="hidden"
                                              name="evidenceId"
                                              value={item.id}
                                            />
                                            <input
                                              type="hidden"
                                              name="returnTo"
                                              value={currentPath}
                                            />
                                            <button
                                              type="submit"
                                              aria-label={`Remover evidência ${item.label}`}
                                              className="grid size-8 place-items-center rounded-lg text-[#a3242b] hover:bg-[#f8e1e1]"
                                            >
                                              <X className="size-3.5" />
                                            </button>
                                          </form>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {response && canRespond ? (
                                  <form
                                    action={addExternalEvidence}
                                    className="mt-3 grid gap-3"
                                  >
                                    <input
                                      type="hidden"
                                      name="responseId"
                                      value={response.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="returnTo"
                                      value={currentPath}
                                    />
                                    <input
                                      name="label"
                                      required
                                      maxLength={200}
                                      placeholder="Nome da evidência"
                                      className={inputClassName}
                                    />
                                    <input
                                      name="externalUrl"
                                      type="url"
                                      required
                                      pattern="https://.*"
                                      placeholder="https://..."
                                      className={inputClassName}
                                    />
                                    <SubmitButton>
                                      Vincular URL segura
                                    </SubmitButton>
                                  </form>
                                ) : !response ? (
                                  <p className="mt-3 text-xs leading-5 text-[#806f6b]">
                                    Salve a resposta antes de anexar evidências.
                                  </p>
                                ) : null}
                                <p className="mt-3 text-[0.68rem] leading-5 text-[#8a7470]">
                                  Upload direto ao Drive será habilitado somente
                                  após a conta institucional e a política de
                                  arquivos serem confirmadas.
                                </p>
                              </div>
                            </div>
                            <form
                              action={validateResponse}
                              className="space-y-4 rounded-2xl border border-[#7aad87]/20 bg-[#f4faf5] p-4"
                            >
                              <input
                                type="hidden"
                                name="returnTo"
                                value={currentPath}
                              />
                              <input
                                type="hidden"
                                name="assessmentId"
                                value={assessment.id}
                              />
                              <input
                                type="hidden"
                                name="responseId"
                                value={response?.id ?? ""}
                              />
                              <input
                                type="hidden"
                                name="criterionId"
                                value={criterion.id}
                              />
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="size-5 text-[#327443]" />
                                <h4 className="font-black text-[#315f3b]">
                                  Validação oficial
                                </h4>
                              </div>
                              <Field
                                label="Nota validada"
                                name={`validated-${criterion.id}`}
                              >
                                <select
                                  className={inputClassName}
                                  name="score"
                                  defaultValue={scalar(
                                    response?.validated_value ?? null,
                                  )}
                                  disabled={!response || !canValidate}
                                  required
                                >
                                  <option value="">Selecione</option>
                                  {rubric.map((level) => (
                                    <option
                                      key={level.id}
                                      value={Number(level.score)}
                                    >
                                      {Number(level.score)} · {level.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field
                                label="Parecer do avaliador"
                                name={`review-${criterion.id}`}
                              >
                                <textarea
                                  className={`${inputClassName} min-h-28`}
                                  name="evaluatorComment"
                                  defaultValue={
                                    response?.evaluator_comment ?? ""
                                  }
                                  disabled={!response || !canValidate}
                                  required
                                />
                              </Field>
                              <SubmitButton
                                disabled={!response || !canValidate}
                              >
                                Validar sem alterar a resposta
                              </SubmitButton>
                            </form>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </DiagnosticAutosaveProvider>
        </main>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="dashboard-card rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2">
              <UserRoundPlus className="size-5 text-[#8b161d]" />
              <h2 className="font-black text-[#481014]">Responsáveis</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#806f6b]">
              O vínculo e as permissões são validados no banco antes de salvar.
            </p>

            <div className="mt-4 space-y-2">
              {respondents.length === 0 ? (
                <p className="rounded-xl bg-[#fcf8f5] p-3 text-xs text-[#806f6b]">
                  Nenhum respondente específico vinculado.
                </p>
              ) : (
                respondents.map((respondent) => (
                  <div
                    key={respondent.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#fcf8f5] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#481014]">
                        {personName(respondent.user_id)}
                      </p>
                      <p className="mt-0.5 text-[0.64rem] font-bold text-[#8a7470] uppercase">
                        {respondent.role === "primary"
                          ? "Responsável principal"
                          : respondent.role === "collaborator"
                            ? "Colaborador"
                            : "Leitor"}
                      </p>
                    </div>
                    <form action={revokeRespondent}>
                      <input
                        type="hidden"
                        name="assessmentId"
                        value={assessment.id}
                      />
                      <input
                        type="hidden"
                        name="userId"
                        value={respondent.user_id}
                      />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={currentPath}
                      />
                      <button
                        type="submit"
                        aria-label={`Remover ${personName(respondent.user_id)}`}
                        className="grid size-9 place-items-center rounded-xl text-[#a3242b] transition hover:bg-[#f8e1e1]"
                      >
                        <X className="size-4" />
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>

            <form
              action={assignRespondent}
              className="mt-4 grid gap-3 border-t border-[#751118]/8 pt-4"
            >
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <input type="hidden" name="returnTo" value={currentPath} />
              <label className="grid gap-1 text-xs font-black text-[#5e4542]">
                Pessoa
                <select
                  name="userId"
                  required
                  className={inputClassName}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {people
                    .filter(
                      (person) =>
                        !respondents.some((item) => item.user_id === person.id),
                    )
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.display_name || person.email}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black text-[#5e4542]">
                Papel na resposta
                <select
                  name="role"
                  required
                  className={inputClassName}
                  defaultValue="collaborator"
                >
                  <option value="primary">Responsável principal</option>
                  <option value="collaborator">Colaborador</option>
                  <option value="viewer">Somente leitura</option>
                </select>
              </label>
              <SubmitButton disabled={people.length === respondents.length}>
                Vincular respondente
              </SubmitButton>
            </form>

            <details className="mt-4 overflow-hidden rounded-2xl border border-[#8b161d]/12 bg-[#fffaf7]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#6f171b]">
                <span className="inline-flex items-center gap-2">
                  <MailPlus className="size-4" /> Convidar nova pessoa
                </span>
                <span className="rounded-full bg-[#f3e6df] px-2 py-0.5 text-[0.62rem] uppercase">
                  por e-mail
                </span>
              </summary>
              <div className="border-t border-[#751118]/8 p-4">
                <p className="text-xs leading-5 text-[#806f6b]">
                  O convite cria o vínculo com a incubadora. O acesso a esta
                  avaliação só é liberado quando a própria pessoa aceitar pelo
                  e-mail enviado.
                </p>
                {pendingRespondentInvitations.length > 0 && (
                  <div
                    className="mt-3 space-y-2"
                    aria-label="Convites pendentes"
                  >
                    {pendingRespondentInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="rounded-xl border border-[#d9b8aa]/35 bg-white px-3 py-2"
                      >
                        <p className="truncate text-xs font-black text-[#481014]">
                          {invitation.invited_name || invitation.email}
                        </p>
                        <p className="mt-0.5 truncate text-[0.65rem] text-[#806f6b]">
                          {invitation.email} ·{" "}
                          {invitation.respondentRole === "primary"
                            ? "principal"
                            : invitation.respondentRole === "viewer"
                              ? "leitor"
                              : "colaborador"}
                        </p>
                        <p className="mt-1 text-[0.62rem] font-bold text-[#9a6b61]">
                          Pendente até{" "}
                          {new Date(invitation.expires_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <form action={inviteRespondent} className="mt-4 grid gap-3">
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <input type="hidden" name="returnTo" value={currentPath} />
                  <Field label="Nome" name="invitedName">
                    <input
                      className={inputClassName}
                      name="invitedName"
                      required
                      minLength={2}
                      maxLength={160}
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="E-mail" name="email">
                    <input
                      className={inputClassName}
                      type="email"
                      name="email"
                      required
                      maxLength={320}
                      autoComplete="email"
                    />
                  </Field>
                  <label className="grid gap-1 text-xs font-black text-[#5e4542]">
                    Papel na incubadora
                    <select
                      name="roleId"
                      required
                      className={inputClassName}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {respondentInvitationRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#5e4542]">
                    Papel nesta resposta
                    <select
                      name="respondentRole"
                      required
                      className={inputClassName}
                      defaultValue="collaborator"
                    >
                      <option value="primary">Responsável principal</option>
                      <option value="collaborator">Colaborador</option>
                      <option value="viewer">Somente leitura</option>
                    </select>
                  </label>
                  <SubmitButton
                    disabled={respondentInvitationRoles.length === 0}
                  >
                    <MailPlus className="size-4" /> Enviar convite
                  </SubmitButton>
                </form>
              </div>
            </details>

            <form
              action={assignEvaluator}
              className="mt-5 grid gap-3 border-t border-[#751118]/8 pt-4"
            >
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <input type="hidden" name="returnTo" value={currentPath} />
              <div className="flex items-center gap-2 text-sm font-black text-[#315f3b]">
                <UserCheck className="size-4" /> Avaliador oficial
              </div>
              {assessment.evaluator_id && (
                <p className="rounded-xl bg-[#eef8f0] px-3 py-2 text-xs font-bold text-[#356442]">
                  Atual: {personName(assessment.evaluator_id)}
                </p>
              )}
              <select
                name="userId"
                required
                className={inputClassName}
                defaultValue={assessment.evaluator_id ?? ""}
              >
                <option value="" disabled>
                  Selecione uma pessoa
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name || person.email}
                  </option>
                ))}
              </select>
              <SubmitButton disabled={people.length === 0}>
                Definir avaliador
              </SubmitButton>
            </form>
          </section>
          <section className="dashboard-card rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-[#8b161d]" />
              <h2 className="font-black text-[#481014]">Resumo</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#806f6b]">Respondidos</dt>
                <dd className="font-black text-[#481014]">
                  {answered}/{criteria.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#806f6b]">Validados</dt>
                <dd className="font-black text-[#2e6e3d]">
                  {validated}/{criteria.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#806f6b]">Gap médio</dt>
                <dd className="font-black text-[#481014]">
                  {assessment.average_gap == null
                    ? "—"
                    : Number(assessment.average_gap).toFixed(1)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#806f6b]">Evidências</dt>
                <dd className="font-black text-[#481014]">
                  {assessment.evidence_coverage == null
                    ? "—"
                    : `${Number(assessment.evidence_coverage).toFixed(0)}%`}
                </dd>
              </div>
            </dl>
          </section>
          <section className="dashboard-card rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[#bd242c]" />
              <h2 className="font-black text-[#481014]">Riscos acionados</h2>
            </div>
            <div className="mt-4 space-y-3">
              {activeTriggers.length === 0 ? (
                <p className="text-sm leading-6 text-[#806f6b]">
                  Nenhum gatilho acionado com os dados atuais.
                </p>
              ) : (
                activeTriggers.map((result) => {
                  const rule = triggerRules.find(
                    (item) => item.id === result.trigger_rule_id,
                  );
                  return (
                    <div
                      key={result.id}
                      className="rounded-xl border border-[#e8b8b8] bg-[#fff0f0] p-3"
                    >
                      <p className="text-sm font-black text-[#8a171c]">
                        {rule?.name ?? "Risco"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#795c59]">
                        {result.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
          <section className="rounded-[1.4rem] bg-[#4a0910] p-5 text-white">
            <BarChart3 className="size-5" />
            <p className="mt-3 text-sm font-black">Classificação atual</p>
            <p className="mt-1 text-2xl font-black capitalize">
              {assessment.classification_code ?? "Em cálculo"}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/65">
              A classificação oficial usa a nota validada; antes disso, mostra a
              autoavaliação.
            </p>
          </section>
          <div className="flex items-start gap-3 rounded-[1.4rem] border border-[#e7dac9] bg-[#fffaf1] p-4 text-xs leading-5 text-[#765f4d]">
            <FileText className="mt-0.5 size-4 shrink-0" /> Evidências
            estruturadas serão armazenadas no Google Drive e vinculadas ao
            critério no Supabase.
          </div>
        </aside>
      </div>
    </div>
  );
}
