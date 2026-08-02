"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro de rota", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main
      id="conteudo-principal"
      className="grid min-h-screen place-items-center bg-[#fbf5ef] p-6"
    >
      <section className="dashboard-card max-w-xl rounded-[2rem] p-9 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fceaea] text-[#ad2b2f]">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-4xl font-black text-[#3f090d]">
          Algo não saiu como esperado.
        </h1>
        <p className="mt-4 leading-7 text-[#766868]">
          O erro foi contido nesta rota. Nenhum detalhe técnico sensível é
          exibido.
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#751118] px-5 py-3.5 font-extrabold text-white"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
