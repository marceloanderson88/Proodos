"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { createProgramAction } from "@/app/(private)/o/[organizationSlug]/m6-actions";
import { ProgramTypeNameField } from "@/components/m6/program-type-name-field";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { createProgramSchema } from "@/lib/m6/schemas";

type FormValues = z.input<typeof createProgramSchema>;
type ParsedFormValues = z.output<typeof createProgramSchema>;

export function ProgramCreateForm({
  organizationSlug,
  incubatorSlug,
}: {
  organizationSlug: string;
  incubatorSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues, unknown, ParsedFormValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      preset: "pre_incubation",
      customName: "",
      name: "",
      description: "",
      objectives: "",
      targetAudience: "",
      deliveryMode: "hybrid",
      durationWeeks: "",
      suggestedCapacity: "",
      startsOn: "",
      endsOn: "",
      isActive: false,
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((_values, event) => {
        if (!event) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() =>
          createProgramAction(organizationSlug, incubatorSlug, formData),
        );
      })}
      className="space-y-6"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField
          label="Nome do programa"
          htmlFor="program-name"
          required
          error={errors.name?.message}
          hint="O código técnico será automático."
        >
          <input
            id="program-name"
            className={controlClassName}
            placeholder="Programa de Pré-Incubação"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>
        <ProgramTypeNameField />
        <FormField
          className="lg:col-span-2"
          label="Descrição"
          htmlFor="program-description"
          error={errors.description?.message}
        >
          <textarea
            id="program-description"
            className={`${controlClassName} min-h-24 resize-y`}
            {...register("description")}
          />
        </FormField>
        <FormField
          label="Objetivos"
          htmlFor="program-objectives"
          error={errors.objectives?.message}
          hint="Que transformação o programa pretende produzir?"
        >
          <textarea
            id="program-objectives"
            className={`${controlClassName} min-h-28 resize-y`}
            {...register("objectives")}
          />
        </FormField>
        <FormField
          label="Público-alvo"
          htmlFor="program-audience"
          error={errors.targetAudience?.message}
          hint="Estágios, setores ou perfis de empreendedores atendidos."
        >
          <textarea
            id="program-audience"
            className={`${controlClassName} min-h-28 resize-y`}
            {...register("targetAudience")}
          />
        </FormField>
      </div>

      <div className="grid gap-4 border-t border-[var(--border)] pt-6 md:grid-cols-3">
        <FormField
          label="Modalidade"
          htmlFor="program-mode"
          required
          error={errors.deliveryMode?.message}
        >
          <select
            id="program-mode"
            className={controlClassName}
            {...register("deliveryMode")}
          >
            <option value="in_person">Presencial</option>
            <option value="remote">Remoto</option>
            <option value="hybrid">Híbrido</option>
          </select>
        </FormField>
        <FormField
          label="Duração estimada"
          htmlFor="program-duration"
          hint="Em semanas."
          error={errors.durationWeeks?.message}
        >
          <input
            id="program-duration"
            type="number"
            min={1}
            max={520}
            className={controlClassName}
            {...register("durationWeeks")}
          />
        </FormField>
        <FormField
          label="Capacidade sugerida"
          htmlFor="program-capacity"
          hint="A turma poderá ajustar esse número."
          error={errors.suggestedCapacity?.message}
        >
          <input
            id="program-capacity"
            type="number"
            min={1}
            className={controlClassName}
            {...register("suggestedCapacity")}
          />
        </FormField>
      </div>

      <div className="grid gap-4 border-t border-[var(--border)] pt-6 md:grid-cols-2">
        <FormField
          label="Início da vigência"
          htmlFor="program-valid-from"
          hint="Opcional; não é a data de execução da turma."
          error={errors.startsOn?.message}
        >
          <input
            id="program-valid-from"
            type="date"
            className={controlClassName}
            {...register("startsOn")}
          />
        </FormField>
        <FormField
          label="Fim da vigência"
          htmlFor="program-valid-until"
          hint="Opcional."
          error={errors.endsOn?.message}
        >
          <input
            id="program-valid-until"
            type="date"
            className={controlClassName}
            {...register("endsOn")}
          />
        </FormField>
        <FileUpload
          className="md:col-span-2"
          name="logo"
          label="Identidade visual"
          hint="PNG, JPG ou WebP, até 2 MB."
        />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm font-bold text-[var(--text)]">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--wine-800)]"
          {...register("isActive")}
        />
        <span>
          <strong className="block text-[var(--text-strong)]">
            Publicar agora
          </strong>
          <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">
            Desmarcado, o programa ficará como rascunho até sua configuração
            estar pronta.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Criar programa"}
        </Button>
      </div>
    </form>
  );
}
