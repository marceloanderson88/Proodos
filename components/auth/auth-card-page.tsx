import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

type AuthCardPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthCardPage({
  eyebrow,
  title,
  description,
  children,
}: AuthCardPageProps) {
  return (
    <main
      id="conteudo-principal"
      className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12"
    >
      <div
        className="wine-panel absolute inset-x-0 top-0 h-72"
        aria-hidden="true"
      />
      <div
        className="dot-field absolute top-5 right-5 h-40 w-52 opacity-30"
        aria-hidden="true"
      />
      <div className="page-enter relative z-10 w-full max-w-lg">
        <div className="mb-7 flex justify-center">
          <BrandMark inverse />
        </div>
        <section className="dashboard-card rounded-[2rem] p-7 sm:p-10">
          <p className="text-xs font-black tracking-[0.16em] text-[#921a20] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#3f090d]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#766868]">{description}</p>
          {children}
        </section>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-white hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao acesso
        </Link>
      </div>
    </main>
  );
}
