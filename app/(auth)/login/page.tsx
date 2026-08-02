import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Eye,
  LockKeyhole,
  Mail,
  Rocket,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const benefits = [
  { icon: Rocket, text: "Impulsione ideias e transforme realidades" },
  { icon: UsersRound, text: "Conecte-se com mentores e especialistas" },
  { icon: BarChart3, text: "Acompanhe resultados e gere impacto" },
] as const;

export const metadata = { title: "Acesso" };

export default function LoginPage() {
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
        <div
          className="absolute inset-x-0 bottom-0 h-28 opacity-25"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 800 120"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 78 C150 15 260 115 410 55 C560 -5 640 92 800 34 L800 120 L0 120Z"
              fill="none"
              stroke="#f4c47a"
              strokeWidth="2"
            />
            <path
              d="M0 98 C190 40 310 130 480 72 C630 22 720 90 800 63"
              fill="none"
              stroke="#fff"
              strokeWidth="1"
            />
          </svg>
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
            <div
              className="mb-7 rounded-2xl border border-[#d97918]/20 bg-[#fff4de] px-4 py-3 text-sm leading-6 text-[#70440d]"
              role="status"
            >
              <strong>Prévia visual do Marco 1.</strong> A autenticação será
              implementada no Marco 2; os controles estão intencionalmente
              desabilitados.
            </div>
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

            <form
              className="mt-9 space-y-5"
              aria-describedby="auth-preview-note"
            >
              <p id="auth-preview-note" className="sr-only">
                Formulário não funcional nesta etapa.
              </p>
              <label className="block text-sm font-bold text-[#3c2a2a]">
                E-mail
                <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-4 py-3.5 text-[#8b8080]">
                  <Mail className="size-5" aria-hidden="true" />
                  <input
                    disabled
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </span>
              </label>
              <label className="block text-sm font-bold text-[#3c2a2a]">
                Senha
                <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d8ceca] bg-white px-4 py-3.5 text-[#8b8080]">
                  <LockKeyhole className="size-5" aria-hidden="true" />
                  <input
                    disabled
                    type="password"
                    placeholder="Digite sua senha"
                    className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                  <Eye className="size-5" aria-hidden="true" />
                </span>
              </label>
              <button
                disabled
                type="submit"
                className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl bg-[#751118] px-5 py-4 font-extrabold text-white opacity-55"
              >
                Entrar
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
                disabled
                type="button"
                className="w-full cursor-not-allowed rounded-xl border border-[#d8ceca] bg-white px-5 py-4 font-bold text-[#625050] opacity-55"
              >
                Entrar com Google · disponível no Marco 2
              </button>
            </form>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-extrabold text-[#751118] hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar
            </Link>
            <Link
              href="/o/sertao-maker/dashboard"
              className="font-extrabold text-[#751118] hover:underline"
            >
              Ver shell demonstrativo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
