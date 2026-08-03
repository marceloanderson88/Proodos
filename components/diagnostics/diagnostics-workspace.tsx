import { Activity, BadgeCheck, ClipboardCheck, Plus, Send } from "lucide-react";

import {
  addDiagnosticCriterionAction,
  addDiagnosticDimensionAction,
  createDiagnosticAssessmentAction,
  createDiagnosticTemplateAction,
  publishDiagnosticTemplateAction,
  saveDiagnosticResponseAction,
  validateDiagnosticResponseAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";
import type { Database, Json } from "@/lib/supabase/database.types";

type Template = Database["public"]["Tables"]["diagnostic_templates"]["Row"];
type Dimension = Database["public"]["Tables"]["diagnostic_dimensions"]["Row"];
type Criterion = Database["public"]["Tables"]["diagnostic_criteria"]["Row"];
type Assessment = Database["public"]["Tables"]["diagnostic_assessments"]["Row"];
type Response = Database["public"]["Tables"]["diagnostic_responses"]["Row"];
type Startup = Pick<
  Database["public"]["Tables"]["startups"]["Row"],
  "id" | "name"
>;

const responseLabels: Record<Criterion["response_type"], string> = {
  numeric: "Nota numérica",
  text: "Texto",
  single_choice: "Escolha única",
  currency: "Moeda",
  percentage: "Percentual",
  date: "Data",
  link: "Link",
  file: "Arquivo / evidência",
};

function jsonText(value: Json | null) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function responseInput(criterion: Criterion, current: Response | undefined) {
  const common = {
    className: inputClassName,
    name: "value",
    defaultValue: jsonText(current?.self_value ?? null),
  };
  if (criterion.response_type === "text")
    return <textarea {...common} className={`${inputClassName} min-h-24`} />;
  if (criterion.response_type === "single_choice") {
    const options = Array.isArray(criterion.options)
      ? criterion.options.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    return (
      <select {...common}>
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (criterion.response_type === "date")
    return <input {...common} type="date" />;
  if (criterion.response_type === "link")
    return <input {...common} type="url" />;
  if (criterion.response_type === "file")
    return <input {...common} placeholder="Referência do arquivo no Drive" />;
  return (
    <input
      {...common}
      type="number"
      step="0.01"
      min="0"
      max={
        criterion.response_type === "numeric"
          ? Number(criterion.maximum_score)
          : undefined
      }
    />
  );
}

export function DiagnosticsWorkspace({
  organizationSlug,
  incubatorSlug,
  incubatorName,
  templates,
  dimensions,
  criteria,
  startups,
  assessments,
  responses,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  incubatorName: string;
  templates: Template[];
  dimensions: Dimension[];
  criteria: Criterion[];
  startups: Startup[];
  assessments: Assessment[];
  responses: Response[];
  success?: string;
  error?: string;
}) {
  const published = templates.filter((item) => item.status === "published");
  const action = <
    T extends (
      organizationSlug: string,
      incubatorSlug: string,
      formData: FormData,
    ) => Promise<void>,
  >(
    handler: T,
  ) => handler.bind(null, organizationSlug, incubatorSlug);
  return (
    <div className="page-enter space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#4a0910] px-6 py-8 text-white shadow-[0_24px_70px_rgb(63_9_13/18%)] sm:px-9">
        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-black tracking-[0.14em] uppercase">
            <ClipboardCheck className="size-3.5" /> Metodologia opcional e
            versionada
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
            Diagnósticos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            Crie modelos para a {incubatorName} e aplique cada diagnóstico a uma
            startup. CERNE pode inspirar um modelo, mas nunca é obrigatório.
          </p>
        </div>
        <div className="absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-[#bd1644]/25 blur-3xl" />
      </header>
      <FeedbackBanner success={success} error={error} />

      <section className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="dashboard-card h-fit rounded-[1.6rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f3dfd0] text-[#751118]">
              <Plus className="size-5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                Biblioteca local
              </p>
              <h2 className="text-xl font-black text-[#3f090d]">Novo modelo</h2>
            </div>
          </div>
          <form
            action={action(createDiagnosticTemplateAction)}
            className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
          >
            <Field label="Nome" name="template-name">
              <input
                className={inputClassName}
                name="name"
                required
                placeholder="Ex.: Diagnóstico de maturidade"
              />
            </Field>
            <Field label="Descrição" name="template-description">
              <textarea
                className={`${inputClassName} min-h-20`}
                name="description"
              />
            </Field>
            <Field label="Instruções" name="template-instructions">
              <textarea
                className={`${inputClassName} min-h-24`}
                name="instructions"
              />
            </Field>
            <SubmitButton>Criar rascunho</SubmitButton>
          </form>
        </div>
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="dashboard-card rounded-[1.6rem] border-dashed p-10 text-center text-sm text-[#806f6b]">
              Nenhum modelo criado nesta incubadora.
            </div>
          ) : (
            templates.map((template) => {
              const templateDimensions = dimensions.filter(
                (item) => item.template_id === template.id,
              );
              const templateCriteria = criteria.filter(
                (item) => item.template_id === template.id,
              );
              return (
                <article
                  key={template.id}
                  className="dashboard-card rounded-[1.6rem] p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span
                        className={
                          template.status === "published"
                            ? "rounded-full bg-[#e8f5e9] px-2.5 py-1 text-[0.65rem] font-black text-[#28713c]"
                            : "rounded-full bg-[#fff0dd] px-2.5 py-1 text-[0.65rem] font-black text-[#8a5216]"
                        }
                      >
                        {template.status === "published"
                          ? "Publicado"
                          : "Rascunho"}{" "}
                        · v{template.version}
                      </span>
                      <h3 className="mt-3 text-2xl font-black text-[#3f090d]">
                        {template.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#806f6b]">
                        {template.description || "Sem descrição."}
                      </p>
                    </div>
                    {template.status === "draft" && (
                      <form action={action(publishDiagnosticTemplateAction)}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <SubmitButton>
                          <Send className="size-4" /> Publicar versão
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                  <div className="mt-5 space-y-3">
                    {templateDimensions.map((dimension) => (
                      <div
                        key={dimension.id}
                        className="rounded-2xl border border-[#751118]/8 bg-[#fcf8f4] p-4"
                      >
                        <div className="flex justify-between gap-3">
                          <h4 className="font-black text-[#4b1619]">
                            {dimension.name}
                          </h4>
                          <span className="text-xs text-[#806f6b]">
                            Peso {Number(dimension.weight)}
                          </span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {templateCriteria
                            .filter(
                              (item) => item.dimension_id === dimension.id,
                            )
                            .map((criterion) => (
                              <li
                                key={criterion.id}
                                className="rounded-xl bg-white px-3 py-2 text-sm text-[#584442]"
                              >
                                <span className="font-bold">
                                  {criterion.prompt}
                                </span>
                                <span className="ml-2 text-[0.65rem] text-[#9a7772]">
                                  {responseLabels[criterion.response_type]} ·
                                  máx. {Number(criterion.maximum_score)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {template.status === "draft" && (
                    <details className="mt-5 rounded-2xl border border-[#751118]/10 p-4">
                      <summary className="cursor-pointer text-sm font-black text-[#751118]">
                        Editar estrutura do rascunho
                      </summary>
                      <div className="mt-4 grid gap-5 border-t border-[#751118]/8 pt-4 lg:grid-cols-2">
                        <form
                          action={action(addDiagnosticDimensionAction)}
                          className="space-y-3"
                        >
                          <input
                            type="hidden"
                            name="templateId"
                            value={template.id}
                          />
                          <h4 className="font-black text-[#3f090d]">
                            Adicionar dimensão
                          </h4>
                          <Field label="Nome" name={`dimension-${template.id}`}>
                            <input
                              className={inputClassName}
                              name="name"
                              required
                            />
                          </Field>
                          <Field
                            label="Descrição"
                            name={`dimension-description-${template.id}`}
                          >
                            <input
                              className={inputClassName}
                              name="description"
                            />
                          </Field>
                          <Field
                            label="Peso"
                            name={`dimension-weight-${template.id}`}
                          >
                            <input
                              className={inputClassName}
                              name="weight"
                              type="number"
                              min="0.1"
                              step="0.1"
                              defaultValue="1"
                              required
                            />
                          </Field>
                          <SubmitButton>Adicionar dimensão</SubmitButton>
                        </form>
                        <form
                          action={action(addDiagnosticCriterionAction)}
                          className="space-y-3"
                        >
                          <input
                            type="hidden"
                            name="templateId"
                            value={template.id}
                          />
                          <h4 className="font-black text-[#3f090d]">
                            Adicionar critério
                          </h4>
                          <Field
                            label="Dimensão"
                            name={`criterion-dimension-${template.id}`}
                          >
                            <select
                              className={inputClassName}
                              name="dimensionId"
                              required
                            >
                              <option value="">Selecione</option>
                              {templateDimensions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field
                            label="Pergunta / critério"
                            name={`criterion-prompt-${template.id}`}
                          >
                            <textarea
                              className={`${inputClassName} min-h-20`}
                              name="prompt"
                              required
                            />
                          </Field>
                          <Field
                            label="Ajuda"
                            name={`criterion-help-${template.id}`}
                          >
                            <input className={inputClassName} name="helpText" />
                          </Field>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Field
                              label="Resposta"
                              name={`criterion-type-${template.id}`}
                            >
                              <select
                                className={inputClassName}
                                name="responseType"
                                defaultValue="numeric"
                              >
                                {Object.entries(responseLabels).map(
                                  ([key, label]) => (
                                    <option key={key} value={key}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </Field>
                            <Field
                              label="Peso"
                              name={`criterion-weight-${template.id}`}
                            >
                              <input
                                className={inputClassName}
                                name="weight"
                                type="number"
                                step="0.1"
                                defaultValue="1"
                              />
                            </Field>
                            <Field
                              label="Nota máxima"
                              name={`criterion-max-${template.id}`}
                            >
                              <input
                                className={inputClassName}
                                name="maximumScore"
                                type="number"
                                step="0.1"
                                defaultValue="5"
                              />
                            </Field>
                          </div>
                          <Field
                            label="Opções (uma por linha)"
                            name={`criterion-options-${template.id}`}
                          >
                            <textarea
                              className={`${inputClassName} min-h-20`}
                              name="options"
                            />
                          </Field>
                          <label className="flex items-center gap-2 text-sm font-bold text-[#584442]">
                            <input
                              type="checkbox"
                              name="allowsNotApplicable"
                              className="accent-[#751118]"
                            />{" "}
                            Permitir “não se aplica” com justificativa
                          </label>
                          <SubmitButton>Adicionar critério</SubmitButton>
                        </form>
                      </div>
                    </details>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#f3dfd0] text-[#751118]">
            <Activity className="size-5" />
          </span>
          <div>
            <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
              Aplicação
            </p>
            <h2 className="text-xl font-black text-[#3f090d]">
              Iniciar diagnóstico de startup
            </h2>
          </div>
        </div>
        <form
          action={action(createDiagnosticAssessmentAction)}
          className="mt-5 grid gap-4 border-t border-[#751118]/8 pt-5 md:grid-cols-3 md:items-end"
        >
          <Field label="Startup" name="assessment-startup">
            <select className={inputClassName} name="startupId" required>
              <option value="">Selecione</option>
              {startups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modelo publicado" name="assessment-template">
            <select className={inputClassName} name="templateId" required>
              <option value="">Selecione</option>
              {published.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · v{item.version}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciclo / referência" name="assessment-cycle">
            <input
              className={inputClassName}
              name="cycleLabel"
              required
              placeholder="Ex.: Entrada · 2026.2"
            />
          </Field>
          <div className="md:col-span-3">
            <SubmitButton>Iniciar diagnóstico</SubmitButton>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[0.68rem] font-black tracking-[0.15em] text-[#9a2930] uppercase">
            Acompanhamento
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#481014]">
            Diagnósticos aplicados
          </h2>
        </div>
        {assessments.length === 0 ? (
          <div className="dashboard-card rounded-[1.6rem] border-dashed p-10 text-center text-sm text-[#806f6b]">
            Nenhum diagnóstico aplicado.
          </div>
        ) : (
          assessments.map((assessment) => {
            const template = templates.find(
              (item) => item.id === assessment.template_id,
            );
            const startup = startups.find(
              (item) => item.id === assessment.startup_id,
            );
            const assessmentCriteria = criteria.filter(
              (item) => item.template_id === assessment.template_id,
            );
            return (
              <article
                key={assessment.id}
                className="dashboard-card rounded-[1.6rem] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                      {startup?.name} · {assessment.cycle_label}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-[#3f090d]">
                      {template?.name ?? "Modelo indisponível"}
                    </h3>
                    <p className="mt-1 text-sm text-[#806f6b]">
                      Status: {assessment.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#fff2e8] px-4 py-3 text-center">
                      <p className="text-[0.6rem] font-black text-[#8a625b] uppercase">
                        Auto
                      </p>
                      <p className="text-xl font-black text-[#651016]">
                        {assessment.self_score === null
                          ? "—"
                          : Number(assessment.self_score).toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#eaf5ec] px-4 py-3 text-center">
                      <p className="text-[0.6rem] font-black text-[#52705a] uppercase">
                        Oficial
                      </p>
                      <p className="text-xl font-black text-[#265d36]">
                        {assessment.validated_score === null
                          ? "—"
                          : Number(assessment.validated_score).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {assessmentCriteria.map((criterion) => {
                    const current = responses.find(
                      (item) =>
                        item.assessment_id === assessment.id &&
                        item.criterion_id === criterion.id,
                    );
                    return (
                      <div
                        key={criterion.id}
                        className="rounded-2xl border border-[#751118]/8 bg-[#fcf8f4] p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <h4 className="font-black text-[#4b1619]">
                              {criterion.prompt}
                            </h4>
                            <p className="mt-1 text-xs text-[#806f6b]">
                              {criterion.help_text ||
                                responseLabels[criterion.response_type]}
                            </p>
                          </div>
                          {current?.validated_at && (
                            <span className="inline-flex h-fit items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-1 text-[0.65rem] font-black text-[#28713c]">
                              <BadgeCheck className="size-3" /> Validado
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          <form
                            action={action(saveDiagnosticResponseAction)}
                            className="space-y-3 rounded-xl bg-white p-4"
                          >
                            <input
                              type="hidden"
                              name="assessmentId"
                              value={assessment.id}
                            />
                            <input
                              type="hidden"
                              name="criterionId"
                              value={criterion.id}
                            />
                            <input
                              type="hidden"
                              name="responseType"
                              value={criterion.response_type}
                            />
                            <Field
                              label="Autoavaliação"
                              name={`self-${assessment.id}-${criterion.id}`}
                            >
                              {responseInput(criterion, current)}
                            </Field>
                            <Field
                              label="Comentário"
                              name={`comment-${assessment.id}-${criterion.id}`}
                            >
                              <textarea
                                className={`${inputClassName} min-h-16`}
                                name="comment"
                                defaultValue={current?.self_comment}
                              />
                            </Field>
                            <Field
                              label="Evidências / referências"
                              name={`evidence-${assessment.id}-${criterion.id}`}
                            >
                              <input
                                className={inputClassName}
                                name="evidenceNotes"
                                defaultValue={current?.evidence_notes}
                              />
                            </Field>
                            {criterion.allows_not_applicable && (
                              <>
                                <label className="flex items-center gap-2 text-xs font-bold">
                                  <input
                                    type="checkbox"
                                    name="isNotApplicable"
                                    defaultChecked={current?.is_not_applicable}
                                  />{" "}
                                  Não se aplica
                                </label>
                                <input
                                  className={inputClassName}
                                  name="notApplicableJustification"
                                  defaultValue={
                                    current?.not_applicable_justification ?? ""
                                  }
                                  placeholder="Justificativa obrigatória"
                                />
                              </>
                            )}
                            <SubmitButton>Salvar resposta</SubmitButton>
                          </form>
                          <form
                            action={action(validateDiagnosticResponseAction)}
                            className="space-y-3 rounded-xl border border-[#2f7143]/10 bg-[#f4faf5] p-4"
                          >
                            <input
                              type="hidden"
                              name="assessmentId"
                              value={assessment.id}
                            />
                            <input
                              type="hidden"
                              name="responseId"
                              value={current?.id ?? ""}
                            />
                            <input
                              type="hidden"
                              name="criterionId"
                              value={criterion.id}
                            />
                            <Field
                              label="Nota validada"
                              name={`validated-${assessment.id}-${criterion.id}`}
                            >
                              <input
                                className={inputClassName}
                                name="score"
                                type="number"
                                min="0"
                                max={Number(criterion.maximum_score)}
                                step="0.01"
                                defaultValue={jsonText(
                                  current?.validated_value ?? null,
                                )}
                                disabled={!current}
                                required
                              />
                            </Field>
                            <Field
                              label="Parecer do avaliador"
                              name={`evaluator-${assessment.id}-${criterion.id}`}
                            >
                              <textarea
                                className={`${inputClassName} min-h-20`}
                                name="evaluatorComment"
                                defaultValue={current?.evaluator_comment}
                                disabled={!current}
                                required
                              />
                            </Field>
                            <SubmitButton disabled={!current}>
                              Validar sem sobrescrever a autoavaliação
                            </SubmitButton>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
