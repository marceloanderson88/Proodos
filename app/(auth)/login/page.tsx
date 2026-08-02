import { ArrowLeft, BarChart3, Rocket, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { BrandMark } from "@/components/brand-mark";
import { getSafeAuthDestination } from "@/lib/auth/safe-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const benefits = [
  { icon: Rocket, text: "Impulsione ideias e transforme realidades" },
  { icon: UsersRound, text: "Conecte-se com mentores e especialistas" },
  { icon: BarChart3, text: "Acompanhe resultados e gere impacto" },
] as const;

export const metadata = { title: "Acesso" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const query = await searchParams;
  const destination = getSafeAuthDestination(query.next);
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect(destination);

  return (
    <main
      id="conteudo-principal"
      className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]"
    >
      <section className="wine-panel relative hidden min-h-screen overflow-hidden p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div
          className="absolute inset-x-0 top-0 h-[28%] rounded-b-[50%] bg-[#fffaf5]"
          aria-hidden="true"
        />
        <div
          className="dot-field absolute top-7 left-7 h-28 w-48 opacity-40"
          aria-hidden="true"
        />
        <BrandMark className="relative z-10 mx-auto mt-8" />
        <div className="relative z-10 mt-auto mb-16 max-w-xl pl-[10%]">
          <p className="text-xs font-black tracking-[0.18em] text-[#f4c47a] uppercase">
            Plataforma Sertão Maker
          </p>
          <h1 className="mt-4 text-5xl leading-[1.02] font-bold tracking-[-0.04em]">
            Bem-vindo à jornada de transformação.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/76">
            Gerencie startups, acompanhe diagnósticos e conecte ações a
            resultados verificáveis.
          </p>
          <div className="mt-10 space-y-4">
            {benefits.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 text-sm font-bold text-white/85"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-[#f4c47a]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10">
        <div
          className="dot-field absolute right-0 bottom-0 h-64 w-64 opacity-45"
          aria-hidden="true"
        />
        <div className="page-enter w-full max-w-xl">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <div className="dashboard-card rounded-[2rem] p-7 sm:p-10">
            <div className="text-center">
              <p className="text-xs font-black tracking-[0.16em] text-[#921a20] uppercase">
                Acesso à plataforma
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#3f090d]">
                Acesse sua conta
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#766868]">
                Entre para continuar na Plataforma Sertão Maker.
              </p>
            </div>
            {query.message === "password-updated" ? (
              <div className="mt-7">
                <AuthFeedback
                  tone="success"
                  message="Senha atualizada. Entre novamente com suas novas credenciais."
                />
              </div>
            ) : null}
            <LoginForm next={destination} />
          </div>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#751118] hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar
          </Link>
        </div>
      </section>
    </main>
  );
}
