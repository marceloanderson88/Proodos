"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import {
  passwordRecoverySchema,
  type PasswordRecoveryInput,
} from "@/lib/auth/schemas";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordRecoveryInput>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: PasswordRecoveryInput) {
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/redefinir-senha");
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    });
    setSent(true);
  }

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {sent ? (
        <AuthFeedback
          tone="success"
          message="Se houver uma conta para este e-mail, enviaremos as instruções de recuperação."
        />
      ) : null}
      <label className="block text-sm font-bold text-[#3c2a2a]">
        E-mail da conta
        <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-4 py-3.5 focus-within:border-[#921a20] focus-within:ring-3 focus-within:ring-[#921a20]/10">
          <Mail className="size-5 text-[#8b8080]" aria-hidden="true" />
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="w-full bg-transparent outline-none"
            aria-invalid={Boolean(errors.email)}
          />
        </span>
        {errors.email ? (
          <span className="mt-1.5 block text-xs text-[#9b1c22]">
            {errors.email.message}
          </span>
        ) : null}
      </label>
      <button
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#751118] px-5 py-4 font-extrabold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Enviando…" : "Enviar instruções"}
        <ArrowRight className="size-5" aria-hidden="true" />
      </button>
    </form>
  );
}
