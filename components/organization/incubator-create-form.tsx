"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MapPin, UserRound } from "lucide-react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { createIncubatorAction } from "@/app/(private)/o/incubator-actions";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { createIncubatorSchema } from "@/lib/incubators/schemas";

type FormValues = z.input<typeof createIncubatorSchema>;
type ParsedFormValues = z.output<typeof createIncubatorSchema>;

export function IncubatorCreateForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [pending, startTransition] = useTransition();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues, unknown, ParsedFormValues>({
    resolver: zodResolver(createIncubatorSchema),
    defaultValues: {
      organizationId,
      kind: "incubator",
      countryCode: "BR",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      customKind: "",
      legalName: "",
      phone: "",
      websiteUrl: "",
    },
  });
  const kind = useWatch({ control, name: "kind" });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((_values, event) => {
        if (!event) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => createIncubatorAction(formData));
      })}
      className="space-y-7"
    >
      <input type="hidden" {...register("organizationId")} />
      <input type="hidden" {...register("locale")} />

      <fieldset className="space-y-4">
        <legend className="operational-heading flex items-center gap-2 text-base text-[var(--text-strong)]">
          <Building2 className="size-4 text-[var(--wine-700)]" /> Identidade
        </legend>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label="Nome da incubadora"
            htmlFor="incubator-name"
            required
            error={errors.name?.message}
          >
            <input
              id="incubator-name"
              className={controlClassName}
              placeholder="Incubadora Sertão Maker"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>
          <FormField
            label="Natureza da operação"
            htmlFor="incubator-kind"
            required
            error={errors.kind?.message}
          >
            <select
              id="incubator-kind"
              className={controlClassName}
              {...register("kind")}
            >
              <option value="incubator">Incubadora</option>
              <option value="accelerator">Aceleradora</option>
              <option value="innovation_hub">Hub de inovação</option>
              <option value="innovation_center">Núcleo de inovação</option>
              <option value="other">Outro</option>
            </select>
          </FormField>
          {kind === "other" && (
            <FormField
              label="Outro tipo"
              htmlFor="incubator-custom-kind"
              required
              error={errors.customKind?.message}
            >
              <input
                id="incubator-custom-kind"
                className={controlClassName}
                aria-invalid={Boolean(errors.customKind)}
                {...register("customKind")}
              />
            </FormField>
          )}
          <FormField
            label="Razão social ou instituição mantenedora"
            htmlFor="incubator-legal-name"
            hint="Opcional; não altera o nome mostrado no sistema."
            error={errors.legalName?.message}
          >
            <input
              id="incubator-legal-name"
              className={controlClassName}
              {...register("legalName")}
            />
          </FormField>
          <FormField
            className="lg:col-span-2"
            label="Descrição curta"
            htmlFor="incubator-description"
            required
            error={errors.shortDescription?.message}
          >
            <textarea
              id="incubator-description"
              className={`${controlClassName} min-h-28 resize-y`}
              placeholder="Explique quem a incubadora atende e qual transformação ela busca produzir."
              aria-invalid={Boolean(errors.shortDescription)}
              {...register("shortDescription")}
            />
          </FormField>
          <FileUpload
            className="lg:col-span-2"
            name="logo"
            label="Logo"
            hint="PNG, JPG ou WebP, até 2 MB."
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-[var(--border)] pt-6">
        <legend className="operational-heading flex items-center gap-2 text-base text-[var(--text-strong)]">
          <MapPin className="size-4 text-[var(--wine-700)]" /> Contato e
          território
        </legend>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="E-mail institucional"
            htmlFor="incubator-email"
            required
            error={errors.contactEmail?.message}
          >
            <input
              id="incubator-email"
              type="email"
              className={controlClassName}
              aria-invalid={Boolean(errors.contactEmail)}
              {...register("contactEmail")}
            />
          </FormField>
          <FormField
            label="Telefone"
            htmlFor="incubator-phone"
            error={errors.phone?.message}
          >
            <input
              id="incubator-phone"
              className={controlClassName}
              placeholder="(87) 99999-9999"
              {...register("phone")}
            />
          </FormField>
          <FormField
            label="Site"
            htmlFor="incubator-site"
            error={errors.websiteUrl?.message}
          >
            <input
              id="incubator-site"
              type="url"
              className={controlClassName}
              placeholder="https://"
              {...register("websiteUrl")}
            />
          </FormField>
          <FormField
            label="Cidade"
            htmlFor="incubator-city"
            required
            error={errors.city?.message}
          >
            <input
              id="incubator-city"
              className={controlClassName}
              aria-invalid={Boolean(errors.city)}
              {...register("city")}
            />
          </FormField>
          <FormField
            label="Estado"
            htmlFor="incubator-state"
            required
            error={errors.state?.message}
          >
            <input
              id="incubator-state"
              className={controlClassName}
              placeholder="Pernambuco"
              aria-invalid={Boolean(errors.state)}
              {...register("state")}
            />
          </FormField>
          <FormField
            label="Fuso horário"
            htmlFor="incubator-timezone"
            required
            error={errors.timezone?.message}
          >
            <select
              id="incubator-timezone"
              className={controlClassName}
              {...register("timezone")}
            >
              <option value="America/Sao_Paulo">Brasília (UTC−03)</option>
              <option value="America/Manaus">Manaus (UTC−04)</option>
              <option value="America/Rio_Branco">Rio Branco (UTC−05)</option>
            </select>
          </FormField>
        </div>
        <input type="hidden" {...register("countryCode")} />
      </fieldset>

      <fieldset className="space-y-4 border-t border-[var(--border)] pt-6">
        <legend className="operational-heading flex items-center gap-2 text-base text-[var(--text-strong)]">
          <UserRound className="size-4 text-[var(--wine-700)]" /> Implantação
        </legend>
        <FormField
          label="Responsável pela implantação"
          htmlFor="incubator-responsible"
          required
          hint="Essa informação identifica o contato inicial; o acesso será concedido pelo fluxo de convites."
          error={errors.responsibleName?.message}
        >
          <input
            id="incubator-responsible"
            className={controlClassName}
            aria-invalid={Boolean(errors.responsibleName)}
            {...register("responsibleName")}
          />
        </FormField>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
        <p className="max-w-xl text-xs leading-5 text-[var(--text-muted)]">
          O identificador técnico é automático. Após criar, o próximo passo será
          convidar o primeiro gestor.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando incubadora…" : "Criar e continuar configuração"}
        </Button>
      </div>
    </form>
  );
}
