import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptInvitationAction } from "@/app/convites/aceitar/actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : "";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && token)
    redirect(
      `/login?next=${encodeURIComponent(`/convites/aceitar?token=${token}`)}`,
    );

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--sand-50)] px-5 py-10">
      <section className="surface-card w-full max-w-xl overflow-hidden">
        <div className="wine-panel px-7 py-8 text-white sm:px-9">
          <BrandMark inverse />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold">
            <ShieldCheck className="size-4" /> Convite protegido
          </p>
          <h1 className="mt-4 text-3xl font-black">
            Entre para a equipe da incubadora
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/72">
            Seu vínculo e papel serão ativados somente depois da confirmação
            autenticada.
          </p>
        </div>
        <div className="p-7 sm:p-9">
          {error || !token ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-10 text-[var(--danger)]" />
              <h2 className="operational-heading mt-4 text-xl">
                Não foi possível usar este convite
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {error ||
                  "O link está incompleto. Solicite um novo convite ao gestor da incubadora."}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--border)] px-5 py-3 text-sm font-extrabold text-[var(--wine-800)]"
              >
                Voltar ao acesso
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e8f5e9] text-[#28713c]">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <h2 className="operational-heading text-xl">
                    Conta confirmada
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Ao aceitar, você receberá o papel definido pelo gestor e
                    verá apenas os recursos autorizados pela RLS.
                  </p>
                </div>
              </div>
              <form action={acceptInvitationAction} className="mt-7">
                <input type="hidden" name="token" value={token} />
                <Button type="submit" className="w-full">
                  Aceitar convite e acessar
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
