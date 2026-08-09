import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { StartupSelfRegistrationForm } from "@/components/startups/startup-self-registration-form";
import { getSupabasePublicEnv } from "@/lib/env";
import { startupPublicRegistrationContextSchema } from "@/lib/startups/public-registration";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function StartupRegistrationPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
}) {
  const { organizationSlug, incubatorSlug } = await params;
  const env = getSupabasePublicEnv();
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.rpc(
    "get_startup_registration_context",
    {
      incubator_slug: incubatorSlug,
      organization_slug: organizationSlug,
    },
  );
  const parsedContext = startupPublicRegistrationContextSchema.safeParse(data);
  if (error || !parsedContext.success) notFound();
  const context = parsedContext.data;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6dfd2_0,transparent_32%),#fffaf5] px-5 py-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-[#751118]/10 bg-white shadow-[0_28px_80px_rgb(63_9_13/12%)] lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="wine-panel relative overflow-hidden px-7 py-9 text-white sm:px-10 lg:min-h-[52rem]">
          <BrandMark inverse />
          <div className="mt-16 max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold">
              <ShieldCheck className="size-4 text-[#f4c47a]" /> Entrada com
              aprovação
            </p>
            <h1 className="mt-6 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Sua startup na {context.incubator.name}
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/75">
              {context.incubator.shortDescription ??
                "Crie sua conta, apresente o empreendimento e acompanhe a análise da incubadora."}
            </p>
            <ol className="mt-10 space-y-5 text-sm text-white/78">
              <li>
                <strong className="mr-3 text-[#f4c47a]">01</strong>Crie a conta
                do representante.
              </li>
              <li>
                <strong className="mr-3 text-[#f4c47a]">02</strong>Envie os
                dados da startup.
              </li>
              <li>
                <strong className="mr-3 text-[#f4c47a]">03</strong>A incubadora
                analisa e ativa o acesso.
              </li>
            </ol>
          </div>
        </aside>
        <section className="px-6 py-8 sm:px-10 sm:py-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#751118] hover:underline"
          >
            <ArrowLeft className="size-4" /> Já possuo acesso
          </Link>
          <div className="mt-7">
            <p className="text-xs font-black tracking-[0.14em] text-[#921a20] uppercase">
              Autocadastro
            </p>
            <h2 className="operational-heading mt-2 text-3xl text-[#3f090d]">
              Solicitar entrada
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#766868]">
              Os dados só entram no portfólio após aprovação da equipe
              responsável.
            </p>
          </div>
          <div className="mt-8">
            <StartupSelfRegistrationForm
              organizationSlug={organizationSlug}
              incubatorSlug={incubatorSlug}
              cohorts={context.cohorts}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
