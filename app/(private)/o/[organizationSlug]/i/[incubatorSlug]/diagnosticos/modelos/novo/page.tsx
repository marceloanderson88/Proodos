import { ArrowLeft, ClipboardPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { createDiagnosticTemplateAction } from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function NewDiagnosticTemplatePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
}) {
  const { organizationSlug, incubatorSlug } = await params;
  await getIncubatorServerContext(organizationSlug, incubatorSlug);
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
  const action = createDiagnosticTemplateAction.bind(
    null,
    organizationSlug,
    incubatorSlug,
  );

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <Link
        href={base}
        className="inline-flex items-center gap-2 text-sm font-black text-[#7b161c]"
      >
        <ArrowLeft className="size-4" /> Voltar à biblioteca
      </Link>
      <header className="rounded-[2rem] bg-[#4a0910] px-6 py-8 text-white shadow-[0_24px_70px_rgb(63_9_13/18%)] sm:px-9">
        <ClipboardPlus className="size-8 text-[#efc5ad]" />
        <h1 className="mt-4 text-4xl font-black tracking-[-0.045em]">
          Novo modelo de diagnóstico
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
          Crie a estrutura inicial como rascunho. Dimensões, critérios, pesos e
          rubricas serão configurados antes da publicação.
        </p>
      </header>
      <form
        action={action}
        className="dashboard-card rounded-[1.7rem] p-6 sm:p-8"
      >
        <div className="grid gap-6">
          <Field label="Nome do modelo" name="template-name">
            <input
              className={inputClassName}
              name="name"
              required
              minLength={3}
              placeholder="Ex.: Diagnóstico de maturidade empresarial"
            />
          </Field>
          <Field label="Descrição" name="template-description">
            <textarea
              className={`${inputClassName} min-h-28`}
              name="description"
              required
              placeholder="Explique o objetivo e quando este modelo deve ser aplicado."
            />
          </Field>
          <Field
            label="Orientações para quem responde (opcional)"
            name="template-instructions"
          >
            <textarea
              className={`${inputClassName} min-h-32`}
              name="instructions"
              placeholder="Informe critérios gerais, documentos recomendados e cuidados no preenchimento."
            />
          </Field>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[#751118]/10 pt-6">
          <p className="inline-flex max-w-xl items-center gap-2 text-xs leading-5 text-[#806f6b]">
            <ShieldCheck className="size-4 shrink-0 text-[#7b161c]" /> O
            rascunho só poderá ser usado em campanhas depois de validado e
            publicado.
          </p>
          <SubmitButton>Criar rascunho</SubmitButton>
        </div>
      </form>
    </div>
  );
}
