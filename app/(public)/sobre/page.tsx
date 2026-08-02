import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Sobre a fundação" };

export default function AboutPage() {
  return (
    <main
      id="conteudo-principal"
      className="paper-grid min-h-screen px-6 py-14"
    >
      <article className="dashboard-card mx-auto max-w-3xl rounded-[2rem] p-8 sm:p-12">
        <div className="grid size-14 place-items-center rounded-2xl bg-[#921a20]/10 text-[#751118]">
          <Construction className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-8 text-xs font-black tracking-[0.16em] text-[#921a20] uppercase">
          Marco 1
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#3f090d] sm:text-5xl">
          Uma fundação, não o produto inteiro.
        </h1>
        <div className="mt-7 space-y-5 text-base leading-8 text-[#625050]">
          <p>
            Esta entrega prepara a aplicação, o sistema visual, os estados de
            rota, a qualidade automatizada e o shell dos módulos previstos no
            SDD.
          </p>
          <p>
            Autenticação, perfis e proteção real de rotas pertencem ao Marco 2.
            Tenancy, papéis e políticas de negócio pertencem ao Marco 3. Os
            links do shell são previews estruturais e não persistem dados.
          </p>
          <p>
            Todos os números exibidos no dashboard estão identificados como
            dados demonstrativos.
          </p>
        </div>
        <Link
          href="/"
          className="mt-9 inline-flex items-center gap-2 font-extrabold text-[#751118] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao início
        </Link>
      </article>
    </main>
  );
}
