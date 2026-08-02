import { ArrowLeft, MapPinned } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="conteudo-principal"
      className="paper-grid grid min-h-screen place-items-center p-6"
    >
      <section className="dashboard-card max-w-xl rounded-[2rem] p-9 text-center sm:p-12">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#921a20]/10 text-[#751118]">
          <MapPinned className="size-8" aria-hidden="true" />
        </div>
        <p className="mt-7 text-xs font-black tracking-[0.16em] text-[#921a20] uppercase">
          Erro 404
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-[#3f090d]">
          Esta trilha não existe.
        </h1>
        <p className="mt-5 leading-7 text-[#766868]">
          A página pode ter mudado ou ainda não faz parte do marco atual.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#751118] px-5 py-3.5 font-extrabold text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
