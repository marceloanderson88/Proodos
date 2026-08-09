"use client";

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { ErrorReference } from "@/components/error-reference";

export default function StartupsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Falha no módulo de startups", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="grid min-h-[65vh] place-items-center p-5">
      <section className="dashboard-card w-full max-w-2xl rounded-[2rem] p-8 text-center sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fceaea] text-[#ad2b2f]">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </span>
        <h1 className="operational-heading mt-6 text-3xl text-[#3f090d]">
          Não foi possível carregar as startups
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#766868]">
          Tente novamente. Se o problema persistir, envie a referência abaixo ao
          suporte sem compartilhar senha ou link de convite.
        </p>
        <ErrorReference reference={error.digest} />
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#751118] px-5 py-3 text-sm font-extrabold text-white"
          >
            <RotateCcw className="size-4" /> Tentar novamente
          </button>
          <Link
            href="/o"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#751118]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#751118]"
          >
            <ArrowLeft className="size-4" /> Voltar à administração
          </Link>
        </div>
      </section>
    </main>
  );
}
