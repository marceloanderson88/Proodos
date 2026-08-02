import { ArrowRight, CheckCircle2, Compass, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const principles = [
  {
    icon: Compass,
    title: "Operação primeiro",
    text: "A jornada funciona sem dependência obrigatória de qualquer metodologia.",
  },
  {
    icon: ShieldCheck,
    title: "Privacidade por padrão",
    text: "A autorização será aplicada no banco, não apenas na interface.",
  },
  {
    icon: CheckCircle2,
    title: "Resultados verificáveis",
    text: "Conteúdo, aplicação, entrega e validação são estados diferentes.",
  },
] as const;

export default function HomePage() {
  return (
    <main
      id="conteudo-principal"
      className="paper-grid min-h-screen overflow-hidden"
    >
      <section className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-6 py-7 lg:px-12">
        <div
          className="dot-field absolute top-0 right-0 h-52 w-60 opacity-50"
          aria-hidden="true"
        />
        <header className="relative z-10 flex items-center justify-between">
          <BrandMark />
          <Link
            href="/login"
            className="rounded-full border border-[#751118]/15 bg-white/70 px-5 py-3 text-sm font-extrabold text-[#751118] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          >
            Ver tela de acesso
          </Link>
        </header>

        <div className="relative z-10 grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="page-enter max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#921a20]/15 bg-white/80 px-4 py-2 text-xs font-black tracking-[0.14em] text-[#751118] uppercase">
              Marco 1 · Fundação técnica
            </p>
            <h1 className="max-w-4xl text-5xl leading-[0.96] font-black tracking-[-0.055em] text-[#3f090d] sm:text-6xl lg:text-8xl">
              Ideias do sertão,
              <span className="block text-[#ad2b2f] italic">
                gestão com direção.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#625050] lg:text-xl">
              Uma fundação digital para acompanhar incubadoras, programas e
              startups com clareza operacional, segurança e memória
              institucional.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/o/sertao-maker/dashboard"
                className="group inline-flex items-center gap-3 rounded-2xl bg-[#751118] px-6 py-4 text-sm font-extrabold text-white shadow-[0_15px_40px_rgba(92,12,18,0.22)] transition hover:-translate-y-1 hover:bg-[#921a20]"
              >
                Explorar shell demonstrativo
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/sobre"
                className="inline-flex items-center rounded-2xl border border-[#751118]/15 bg-white/75 px-6 py-4 text-sm font-extrabold text-[#751118] transition hover:bg-white"
              >
                Entender esta etapa
              </Link>
            </div>
          </div>

          <div className="wine-panel relative overflow-hidden rounded-[2.5rem] p-7 text-white shadow-[0_30px_90px_rgba(63,9,13,0.24)] sm:p-10">
            <div
              className="absolute -top-28 -right-20 size-72 rounded-full border border-white/10"
              aria-hidden="true"
            />
            <div
              className="absolute -right-4 bottom-8 size-40 rounded-full border border-white/10"
              aria-hidden="true"
            />
            <p className="text-xs font-black tracking-[0.18em] text-[#f4c47a] uppercase">
              Princípios do produto
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Estrutura para crescer sem burocratizar.
            </h2>
            <div className="mt-9 space-y-4">
              {principles.map(({ icon: Icon, title, text }, index) => (
                <article
                  key={title}
                  className="stagger-item flex gap-4 rounded-2xl border border-white/10 bg-white/7 p-4 backdrop-blur-sm"
                  style={{ "--stagger": index + 1 } as React.CSSProperties}
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f4c47a]/15 text-[#f4c47a]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-body)] text-sm font-black">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      {text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
