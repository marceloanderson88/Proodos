"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { getSafeAuthDestination } from "@/lib/auth/safe-redirect";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type LoginFormProps = { next?: string };

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [feedback, setFeedback] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const destination = getSafeAuthDestination(next);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFeedback(undefined);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFeedback(
        "E-mail ou senha inválidos. Confira os dados e tente novamente.",
      );
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  async function signInWithGoogle() {
    setFeedback(undefined);
    setGooglePending(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", destination);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (error) {
      setGooglePending(false);
      setFeedback("Não foi possível iniciar o acesso com Google.");
    }
  }

  return (
    <form
      className="mt-9 space-y-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {feedback ? <AuthFeedback message={feedback} /> : null}
      <label className="block text-sm font-bold text-[#3c2a2a]">
        E-mail
        <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-4 py-3.5 focus-within:border-[#921a20] focus-within:ring-3 focus-within:ring-[#921a20]/10">
          <Mail className="size-5 text-[#8b8080]" aria-hidden="true" />
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="w-full bg-transparent text-[#3c2a2a] outline-none placeholder:text-[#a99e99]"
          />
        </span>
        {errors.email ? (
          <span
            id="email-error"
            className="mt-1.5 block text-xs text-[#9b1c22]"
          >
            {errors.email.message}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-bold text-[#3c2a2a]">
        Senha
        <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-4 py-3.5 focus-within:border-[#921a20] focus-within:ring-3 focus-within:ring-[#921a20]/10">
          <LockKeyhole className="size-5 text-[#8b8080]" aria-hidden="true" />
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="w-full bg-transparent text-[#3c2a2a] outline-none placeholder:text-[#a99e99]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-md p-1 text-[#766868] hover:text-[#751118]"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        </span>
        {errors.password ? (
          <span
            id="password-error"
            className="mt-1.5 block text-xs text-[#9b1c22]"
          >
            {errors.password.message}
          </span>
        ) : null}
      </label>
      <div className="flex justify-end">
        <Link
          href="/recuperar-senha"
          className="text-sm font-bold text-[#751118] hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
      <button
        disabled={isSubmitting || googlePending}
        type="submit"
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#751118] px-5 py-4 font-extrabold text-white shadow-lg shadow-[#751118]/15 transition hover:bg-[#921a20] disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Entrando…" : "Entrar"}
        <ArrowRight className="size-5" aria-hidden="true" />
      </button>
      <div
        className="flex items-center gap-4 text-xs font-bold text-[#958989]"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-[#e5dcd7]" />
        ou
        <span className="h-px flex-1 bg-[#e5dcd7]" />
      </div>
      <button
        disabled={isSubmitting || googlePending}
        type="button"
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-5 py-4 font-bold text-[#625050] transition hover:border-[#b8aaa5] hover:bg-[#fffaf7] disabled:cursor-wait disabled:opacity-60"
      >
        <span className="text-lg font-black text-[#4285f4]" aria-hidden="true">
          G
        </span>
        {googlePending ? "Redirecionando…" : "Entrar com Google"}
      </button>
    </form>
  );
}
