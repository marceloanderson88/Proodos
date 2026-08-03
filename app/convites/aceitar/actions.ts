"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function acceptInvitationAction(formData: FormData) {
  const rawToken = formData.get("token");
  if (typeof rawToken !== "string" || rawToken.length < 32) {
    redirect("/convites/aceitar?error=Convite inválido.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(
      `/login?next=${encodeURIComponent(`/convites/aceitar?token=${rawToken}`)}`,
    );
  }

  const { data, error } = await supabase.rpc("accept_invitation", {
    raw_token: rawToken,
  });
  if (error || !data?.[0]) {
    redirect(
      `/convites/aceitar?error=${encodeURIComponent(error?.message ?? "Não foi possível aceitar o convite.")}`,
    );
  }

  const accepted = data[0];
  const { data: incubator } = await supabase
    .from("incubators")
    .select("slug")
    .eq("organization_id", accepted.organization_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name")
    .limit(1)
    .maybeSingle();

  redirect(
    incubator
      ? `/o/${accepted.organization_slug}/i/${incubator.slug}/dashboard?success=${encodeURIComponent("Convite aceito. Seu acesso está ativo.")}`
      : "/o",
  );
}
