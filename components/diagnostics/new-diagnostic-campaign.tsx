import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Mail,
  Users,
} from "lucide-react";
import Link from "next/link";

import { createDiagnosticCampaignAction } from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";

export function NewDiagnosticCampaign({
  organizationSlug,
  incubatorSlug,
  templates,
  programs,
  cohorts,
  startups,
  evaluators,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  templates: {
    id: string;
    name: string;
    version: number;
    version_label: string | null;
  }[];
  programs: { id: string; name: string }[];
  cohorts: { id: string; name: string; program_id: string }[];
  startups: { id: string; name: string; stage: string }[];
  evaluators: { id: string; full_name: string; email: string }[];
}) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const action = createDiagnosticCampaignAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );

  return (
    <div className="page-enter space-y-6">
      <Link
        href={base}
        className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
      >
        <ArrowLeft className="size-4" /> Voltar aos diagnósticos
      </Link>
      <header>
        <p className="text-[0.68rem] font-black tracking-[0.14em] text-[#a22a31] uppercase">
          Configuração guiada
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.045em] text-[#3f090d]">
          Nova campanha de autodiagnóstico
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#806f6b]">
          Defina o modelo, o período, as startups e o avaliador. As aplicações
          são criadas juntas, de forma transacional.
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-4" aria-label="Etapas da campanha">
        {[
          [ClipboardList, "Diagnóstico"],
          [CalendarDays, "Período"],
          [Users, "Participantes"],
          [Mail, "Comunicação"],
        ].map(([Icon, label], index) => {
          const StepIcon = Icon as typeof ClipboardList;
          return (
            <li
              key={String(label)}
              className="dashboard-card flex items-center gap-3 rounded-2xl p-4"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#7f1118] text-white">
                <StepIcon className="size-4" />
              </span>
              <div>
                <p className="text-[0.6rem] font-black text-[#9a7772] uppercase">
                  Etapa {index + 1}
                </p>
                <p className="text-sm font-black text-[#481014]">
                  {String(label)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <form action={action} className="space-y-6">
        <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Modelo publicado" name="campaign-template">
              <select className={inputClassName} name="templateId" required>
                <option value="">Selecione a versão</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · v
                    {template.version_label ?? template.version}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome da campanha" name="campaign-name">
              <input
                className={inputClassName}
                name="name"
                required
                placeholder="Ex.: Diagnóstico de Maturidade · Ciclo 2026/2"
              />
            </Field>
            <Field label="Programa (opcional)" name="campaign-program">
              <select className={inputClassName} name="programId">
                <option value="">Toda a incubadora / seleção manual</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Turma (opcional)" name="campaign-cohort">
              <select className={inputClassName} name="cohortId">
                <option value="">Sem turma específica</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Início" name="campaign-start">
              <input
                className={inputClassName}
                name="startsAt"
                type="datetime-local"
                required
              />
            </Field>
            <Field label="Encerramento" name="campaign-end">
              <input
                className={inputClassName}
                name="endsAt"
                type="datetime-local"
                required
              />
            </Field>
            <Field
              label="Avaliador padrão (opcional)"
              name="campaign-evaluator"
            >
              <select className={inputClassName} name="evaluatorId">
                <option value="">Atribuir depois</option>
                {evaluators.map((evaluator) => (
                  <option key={evaluator.id} value={evaluator.id}>
                    {evaluator.full_name} · {evaluator.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#751118]/8 pb-5">
            <div>
              <p className="text-[0.65rem] font-black tracking-[0.13em] text-[#9a2930] uppercase">
                Participantes
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#481014]">
                Startups convidadas
              </h2>
            </div>
            <p className="text-xs text-[#806f6b]">
              O banco valida se pertencem à incubadora e, quando informado, ao
              programa/turma.
            </p>
          </div>
          {startups.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#806f6b]">
              Cadastre uma startup antes de criar a campanha.
            </p>
          ) : (
            <fieldset className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <legend className="sr-only">Selecione as startups</legend>
              {startups.map((startup) => (
                <label
                  key={startup.id}
                  className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[#751118]/10 bg-[#fcf9f6] p-4 transition hover:border-[#8b151c]/30 has-[:checked]:border-[#8b151c] has-[:checked]:bg-[#fff2ec]"
                >
                  <input
                    className="peer sr-only"
                    type="checkbox"
                    name="startupIds"
                    value={startup.id}
                  />
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#9d7773]/30 bg-white text-transparent peer-checked:border-[#7e1118] peer-checked:bg-[#7e1118] peer-checked:text-white">
                    <Check className="size-4" />
                  </span>
                  <span>
                    <strong className="block text-sm text-[#481014]">
                      {startup.name}
                    </strong>
                    <span className="text-xs text-[#806f6b]">
                      {startup.stage.replaceAll("_", " ")}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </section>

        <section className="dashboard-card rounded-[1.6rem] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field
              label="Assunto da comunicação (opcional)"
              name="campaign-subject"
            >
              <input
                className={inputClassName}
                name="communicationSubject"
                placeholder="Convite para o diagnóstico"
              />
            </Field>
            <Field label="Mensagem (opcional)" name="campaign-message">
              <textarea
                className={`${inputClassName} min-h-28`}
                name="communicationMessage"
                placeholder="A mensagem fica registrada; o envio será conectado ao canal configurado em fase posterior."
              />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#751118]/8 pt-5">
            <Link
              href={base}
              className="inline-flex min-h-11 items-center rounded-xl border border-[#7b161c]/20 px-5 text-sm font-black text-[#7b161c]"
            >
              Cancelar
            </Link>
            <SubmitButton
              disabled={templates.length === 0 || startups.length === 0}
            >
              Criar campanha e aplicações
            </SubmitButton>
          </div>
        </section>
      </form>
    </div>
  );
}
