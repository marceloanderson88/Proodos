import { ArrowLeft, Construction, FileCheck2 } from "lucide-react";
import Link from "next/link";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  organizationSlug: string;
  dashboardHref?: string;
};

export function ModulePlaceholder({
  title,
  description,
  organizationSlug,
  dashboardHref,
}: ModulePlaceholderProps) {
  return (
    <div className="page-enter grid min-h-[65vh] place-items-center py-10">
      <section className="dashboard-card w-full max-w-3xl rounded-[2rem] p-8 text-center sm:p-12">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#921a20]/10 text-[#751118]">
          <Construction className="size-8" aria-hidden="true" />
        </div>
        <p className="mt-7 text-xs font-black tracking-[0.16em] text-[#921a20] uppercase">
          Shell preparado · sem persistência
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#3f090d] sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#766868]">
          {description}
        </p>
        <div className="mx-auto mt-8 flex max-w-lg items-start gap-3 rounded-2xl border border-[#d97918]/20 bg-[#fff4de] p-4 text-left text-sm leading-6 text-[#70440d]">
          <FileCheck2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Esta rota valida navegação, layout e responsividade. Regras,
            formulários e dados serão implementados somente no marco
            correspondente do SDD.
          </p>
        </div>
        <Link
          href={dashboardHref ?? `/o/${organizationSlug}/dashboard`}
          className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#751118] px-5 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#921a20]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao dashboard
        </Link>
      </section>
    </div>
  );
}
