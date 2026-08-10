import { ArrowRight, CalendarDays, Gavel } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicCallSummary = {
  slug: string;
  code: string;
  title: string;
  summary: string | null;
  status: string;
  openAt: string;
  closeAt: string;
  incubatorName: string;
  programName: string;
  cohortName: string;
};

export const dynamic = "force-dynamic";

export default async function PublicSelectionCallsPage() {
  const supabase = await createServerSupabaseClient();
  const [callsResult, openResult] = await Promise.all([
    supabase.rpc("list_public_selection_calls"),
    supabase.rpc("list_open_selection_call_slugs"),
  ]);
  if (callsResult.error || openResult.error)
    throw new Error("Falha ao carregar as chamadas públicas.");
  const calls = callsResult.data as Json as unknown as PublicCallSummary[];
  const openSlugs = new Set(openResult.data ?? []);

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <header className="flex items-center justify-between">
          <BrandMark />
          <Link
            href="/login"
            className="rounded-full border border-[#751118]/15 bg-white px-4 py-2 text-sm font-extrabold text-[#751118]"
          >
            Acesso interno
          </Link>
        </header>
        <section className="py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#751118] text-[#f4c47a]">
            <Gavel className="size-6" />
          </span>
          <p className="eyebrow mt-6">Oportunidades abertas</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[#3f090d] sm:text-6xl">
            Chamadas para quem está construindo o próximo passo.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#746661]">
            Conheça os processos seletivos das incubadoras, consulte os prazos e
            envie sua proposta diretamente pelo Proodos.
          </p>
        </section>
        <section className="grid gap-5 pb-16 md:grid-cols-2">
          {calls.map((call) => {
            const open = openSlugs.has(call.slug);
            return (
              <article
                key={call.slug}
                className="surface-card group overflow-hidden p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="eyebrow">{call.code}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${open ? "bg-[#e8f5e9] text-[#28713c]" : "bg-[#eee8e5] text-[#655854]"}`}
                  >
                    {open ? "Inscrições abertas" : "Consulta pública"}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-[#3f090d]">
                  {call.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#746661]">
                  {call.summary}
                </p>
                <p className="mt-5 flex items-center gap-2 text-xs font-bold text-[#8a4c08]">
                  <CalendarDays className="size-4" /> Até{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  }).format(new Date(call.closeAt))}
                </p>
                <p className="mt-2 text-xs text-[#8b7c76]">
                  {call.incubatorName} · {call.programName} · {call.cohortName}
                </p>
                <Link
                  href={`/chamadas/${call.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#751118]"
                >
                  Ver chamada{" "}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
