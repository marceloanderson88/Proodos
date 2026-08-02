"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import {
  passwordResetSchema,
  type PasswordResetInput,
} from "@/lib/auth/schemas";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PasswordResetForm() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [feedback, setFeedback] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  });

  async function onSubmit({ password }: PasswordResetInput) {
    setFeedback(undefined);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFeedback(
        "O link é inválido ou expirou. Solicite uma nova recuperação.",
      );
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login?message=password-updated");
    router.refresh();
  }

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {feedback ? <AuthFeedback message={feedback} /> : null}
      {(["password", "passwordConfirmation"] as const).map((field) => (
        <label key={field} className="block text-sm font-bold text-[#3c2a2a]">
          {field === "password" ? "Nova senha" : "Confirmar nova senha"}
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-4 py-3.5 focus-within:border-[#921a20]">
            <LockKeyhole className="size-5 text-[#8b8080]" aria-hidden="true" />
            <input
              {...register(field)}
              type="password"
              autoComplete="new-password"
              className="w-full bg-transparent outline-none"
              aria-invalid={Boolean(errors[field])}
            />
          </span>
          {errors[field] ? (
            <span className="mt-1.5 block text-xs text-[#9b1c22]">
              {errors[field]?.message}
            </span>
          ) : null}
        </label>
      ))}
      <button
        disabled={isSubmitting}
        className="w-full rounded-xl bg-[#751118] px-5 py-4 font-extrabold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
