import { Building2, LogOut, MailCheck, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Aguardando vínculo com uma organização" };
export const dynamic = "force-dynamic";

export default async function NoOrganizationPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fbf5ef] px-5 py-12">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#651017] via-[#a82b31] to-[#d6a057]" />
      <div className="absolute -top-24 -left-24 size-80 rounded-full bg-[#b52931]/8 blur-3xl" />
      <section className="relative w-full max-w-2xl rounded-[2rem] border border-[#751118]/10 bg-white/90 p-7 shadow-[0_28px_80px_rgba(73,18,20,0.12)] backdrop-blur sm:p-11">
        <BrandMark className="mb-9 max-w-56" />
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fff1dc] px-3 py-1.5 text-xs font-extrabold tracking-[0.12em] text-[#81430d] uppercase">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Acesso protegido
        </span>
        <h1 className="mt-5 font-serif text-4xl leading-tight font-black text-[#43090d] sm:text-5xl">
          Sua conta ainda não está vinculada a uma incubadora.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#6f5d57]">
          O login foi concluído, mas o acesso aos dados depende de um convite ou
          vínculo ativo. Essa separação impede que uma conta autenticada entre
          em outra organização apenas conhecendo sua URL.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#751118]/10 bg-[#fffaf5] p-4">
            <MailCheck className="size-6 text-[#9c1d25]" aria-hidden="true" />
            <p className="mt-3 font-extrabold text-[#43090d]">
              Se recebeu convite
            </p>
            <p className="mt-1 text-sm leading-6 text-[#77655f]">
              Abra o link enviado ao mesmo e-mail usado neste acesso.
            </p>
          </div>
          <div className="rounded-2xl border border-[#751118]/10 bg-[#fffaf5] p-4">
            <Building2 className="size-6 text-[#9c1d25]" aria-hidden="true" />
            <p className="mt-3 font-extrabold text-[#43090d]">
              Se faz parte da equipe
            </p>
            <p className="mt-1 text-sm leading-6 text-[#77655f]">
              Solicite ao administrador que ative seu vínculo institucional.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#751118]/8 pt-6">
          <p className="text-sm text-[#8b7c76]">Conectado como {user.email}</p>
          <form action="/auth/logout" method="post">
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#751118]/15 px-4 py-2.5 text-sm font-extrabold text-[#751118] hover:bg-[#751118]/5">
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
