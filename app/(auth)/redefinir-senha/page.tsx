import { redirect } from "next/navigation";

import { AuthCardPage } from "@/components/auth/auth-card-page";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Redefinir senha" };
export const dynamic = "force-dynamic";

export default async function PasswordResetPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/erro?code=recovery-session-missing");

  return (
    <AuthCardPage
      eyebrow="Segurança da conta"
      title="Crie uma nova senha"
      description="Use uma senha exclusiva com pelo menos oito caracteres."
    >
      <PasswordResetForm />
    </AuthCardPage>
  );
}
