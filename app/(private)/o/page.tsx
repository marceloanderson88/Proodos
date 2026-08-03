import { redirect } from "next/navigation";

import { ProodosAdmin } from "@/components/organization/proodos-admin";
import { firstSearchValue } from "@/lib/m6/server-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProodosAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const feedback = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=%2Fo");

  const [{ data: organizations }, { data: profile }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const organization =
    (organizations ?? []).find((item) => item.slug === "proodos") ??
    (organizations ?? [])[0];
  if (!organization) redirect("/sem-organizacao");

  const [incubatorsResult, programsResult, startupsResult] = await Promise.all([
    supabase
      .from("incubators")
      .select("id, name, slug, status, timezone, locale")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .order("status")
      .order("name"),
    supabase
      .from("programs")
      .select("id, incubator_id")
      .eq("organization_id", organization.id)
      .is("deleted_at", null),
    supabase
      .from("startups")
      .select("id, incubator_id")
      .eq("organization_id", organization.id)
      .is("deleted_at", null),
  ]);
  if (incubatorsResult.error || programsResult.error || startupsResult.error)
    throw new Error("Falha ao carregar a administração do Proodos.");

  const programs = programsResult.data ?? [];
  const startups = startupsResult.data ?? [];
  const incubators = (incubatorsResult.data ?? []).map((incubator) => ({
    ...incubator,
    programCount: programs.filter((item) => item.incubator_id === incubator.id)
      .length,
    startupCount: startups.filter((item) => item.incubator_id === incubator.id)
      .length,
  }));

  return (
    <ProodosAdmin
      organization={organization}
      incubators={incubators}
      userName={profile?.display_name ?? user.email?.split("@")[0] ?? "Usuário"}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
