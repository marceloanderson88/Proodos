"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createStartupApplicationAction } from "@/app/cadastro/startup/[organizationSlug]/[incubatorSlug]/actions";
import {
  startupSelfRegistrationSchema,
  type StartupSelfRegistrationInput,
  type StartupSelfRegistrationFormValues,
} from "@/lib/m6/schemas";

type CohortOption = { id: string; label: string };

export function StartupSelfRegistrationForm({
  organizationSlug,
  incubatorSlug,
  cohorts,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  cohorts: CohortOption[];
}) {
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string }>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    StartupSelfRegistrationFormValues,
    unknown,
    StartupSelfRegistrationInput
  >({
    resolver: zodResolver(startupSelfRegistrationSchema),
    defaultValues: {
      applicantName: "",
      email: "",
      password: "",
      name: "",
      legalName: "",
      taxId: "",
      sector: "",
      businessModel: "",
      stage: "idea",
      city: "",
      state: "",
      websiteUrl: "",
      cohortId: "",
    },
  });

  async function onSubmit(values: StartupSelfRegistrationInput) {
    setFeedback(undefined);
    const result = await createStartupApplicationAction(
      organizationSlug,
      incubatorSlug,
      values,
    );
    setFeedback(result);
  }

  if (feedback?.ok) {
    return (
      <div className="rounded-[1.7rem] border border-[#cde4cf] bg-[#f2faf2] p-7 text-center">
        <CheckCircle2 className="mx-auto size-11 text-[#28713c]" />
        <h2 className="operational-heading mt-4 text-2xl text-[#284d31]">
          Solicitação recebida
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#52705a]">
          {feedback.message}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#751118] px-5 py-3 text-sm font-extrabold text-white"
        >
          Ir para o acesso
        </Link>
      </div>
    );
  }

  const fieldClass =
    "mt-2 min-h-12 w-full rounded-xl border border-[#ded2cc] bg-white px-4 py-3 text-sm text-[#3f090d] outline-none transition focus:border-[#921a20] focus:ring-3 focus:ring-[#921a20]/10";
  const errorText = (message?: string) =>
    message ? <p className="mt-1.5 text-xs text-[#a31d25]">{message}</p> : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
      {feedback ? (
        <div
          role="alert"
          className="rounded-xl border border-[#efc8ca] bg-[#fff0f0] px-4 py-3 text-sm text-[#8b171d]"
        >
          {feedback.message}
        </div>
      ) : null}

      <fieldset>
        <legend className="flex items-center gap-3 text-lg font-black text-[#4b0a0e]">
          <UserRound className="size-5 text-[#921a20]" /> Seus dados de acesso
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#4f3b38]">
            Nome completo
            <input
              {...register("applicantName")}
              className={fieldClass}
              autoComplete="name"
            />
            {errorText(errors.applicantName?.message)}
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            E-mail
            <span className="relative block">
              <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#9a8a84]" />
              <input
                {...register("email")}
                className={`${fieldClass} pl-11`}
                type="email"
                autoComplete="email"
              />
            </span>
            {errorText(errors.email?.message)}
          </label>
          <label className="text-sm font-bold text-[#4f3b38] sm:col-span-2">
            Senha
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#9a8a84]" />
              <input
                {...register("password")}
                className={`${fieldClass} pl-11`}
                type="password"
                autoComplete="new-password"
              />
            </span>
            <span className="mt-1.5 block text-xs font-normal text-[#806f69]">
              Mínimo de 8 caracteres.
            </span>
            {errorText(errors.password?.message)}
          </label>
        </div>
      </fieldset>

      <fieldset className="border-t border-[#751118]/10 pt-7">
        <legend className="flex items-center gap-3 text-lg font-black text-[#4b0a0e]">
          <Building2 className="size-5 text-[#921a20]" /> Dados da startup
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#4f3b38]">
            Nome da startup
            <input {...register("name")} className={fieldClass} />
            {errorText(errors.name?.message)}
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            Razão social
            <input {...register("legalName")} className={fieldClass} />
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            CNPJ ou registro
            <input {...register("taxId")} className={fieldClass} />
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            Setor
            <input
              {...register("sector")}
              className={fieldClass}
              placeholder="Agtech, educação, saúde..."
            />
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            Estágio
            <select {...register("stage")} className={fieldClass}>
              <option value="idea">Ideia</option>
              <option value="validation">Validação</option>
              <option value="operation">Operação</option>
              <option value="traction">Tração</option>
              <option value="scale">Escala</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            Site
            <input
              {...register("websiteUrl")}
              className={fieldClass}
              type="url"
              placeholder="https://"
            />
            {errorText(errors.websiteUrl?.message)}
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            Cidade
            <input {...register("city")} className={fieldClass} />
          </label>
          <label className="text-sm font-bold text-[#4f3b38]">
            Estado
            <input {...register("state")} className={fieldClass} />
          </label>
          <label className="text-sm font-bold text-[#4f3b38] sm:col-span-2">
            Modelo de negócio
            <textarea
              {...register("businessModel")}
              className={fieldClass}
              rows={4}
            />
          </label>
          {cohorts.length ? (
            <label className="text-sm font-bold text-[#4f3b38] sm:col-span-2">
              Programa ou turma de interesse (opcional)
              <select {...register("cohortId")} className={fieldClass}>
                <option value="">
                  Quero apenas solicitar entrada na incubadora
                </option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#751118] px-6 py-4 font-extrabold text-white shadow-lg shadow-[#751118]/15 transition hover:bg-[#921a20] disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting
          ? "Enviando solicitação…"
          : "Criar conta e solicitar entrada"}
        <ArrowRight className="size-5" />
      </button>
    </form>
  );
}
