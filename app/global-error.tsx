"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="grid min-h-screen place-items-center bg-[#3f090d] p-6 text-white">
          <section className="max-w-xl text-center">
            <p className="text-xs font-black tracking-[0.18em] text-[#f4c47a] uppercase">
              Erro global
            </p>
            <h1 className="mt-4 font-serif text-5xl font-black">
              Não foi possível carregar a plataforma.
            </h1>
            <p className="mt-5 leading-7 text-white/70">
              Tente novamente. Se o problema persistir, informe o horário e a
              página acessada ao suporte.
            </p>
            <button
              onClick={reset}
              className="mt-8 rounded-xl bg-white px-5 py-3.5 font-extrabold text-[#751118]"
            >
              Recarregar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
