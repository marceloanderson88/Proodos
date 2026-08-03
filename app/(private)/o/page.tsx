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

  const [
    incubatorsResult,
    programsResult,
    startupsResult,
    assignmentsResult,
    invitationsResult,
  ] = await Promise.all([
    supabase
      .from("incubators")
      .select(
        "id, name, slug, status, timezone, locale, kind, custom_kind, short_description, logo_path, contact_email, city, state, responsible_name",
      )
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
    supabase
      .from("role_assignments")
      .select("id, incubator_id")
      .eq("organization_id", organization.id)
      .not("incubator_id", "is", null),
    supabase
      .from("invitations")
      .select("id, incubator_id")
      .eq("organization_id", organization.id)
      .eq("status", "pending")
      .not("incubator_id", "is", null),
  ]);
  if (
    incubatorsResult.error ||
    programsResult.error ||
    startupsResult.error ||
    assignmentsResult.error ||
    invitationsResult.error
  )
    throw new Error("Falha ao carregar a administração do Proodos.");

  const programs = programsResult.data ?? [];
  const startups = startupsResult.data ?? [];
  const incubators = await Promise.all(
    (incubatorsResult.data ?? []).map(async (incubator) => {
      const logoUrl = incubator.logo_path
        ? ((
            await supabase.storage
              .from("incubator-logos")
              .createSignedUrl(incubator.logo_path, 60 * 60)
          ).data?.signedUrl ?? null)
        : null;
      return {
        ...incubator,
        logoUrl,
        programCount: programs.filter(
          (item) => item.incubator_id === incubator.id,
        ).length,
        startupCount: startups.filter(
          (item) => item.incubator_id === incubator.id,
        ).length,
        peopleCount: (assignmentsResult.data ?? []).filter(
          (item) => item.incubator_id === incubator.id,
        ).length,
        pendingInvitationCount: (invitationsResult.data ?? []).filter(
          (item) => item.incubator_id === incubator.id,
        ).length,
      };
    }),
  );

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
