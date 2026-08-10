import { IncubatorPeopleManagement } from "@/components/incubator/incubator-people-management";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

const managementViews = new Set(["operacao", "equipe", "convites"]);

export default async function IncubatorPeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug }, feedback] = await Promise.all([
    params,
    searchParams,
  ]);
  const requestedView = firstSearchValue(feedback.view) ?? "operacao";
  const view = managementViews.has(requestedView) ? requestedView : "operacao";
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );

  const [membershipsResult, rolesResult, assignmentsResult, invitationsResult] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select("id, user_id")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .order("created_at"),
      supabase
        .from("roles")
        .select("id, name, description")
        .eq("organization_id", organization.id)
        .eq("scope_type", "incubator")
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("role_assignments")
        .select("id, membership_id, role_id")
        .eq("organization_id", organization.id)
        .eq("incubator_id", incubator.id)
        .order("created_at"),
      supabase
        .from("invitations")
        .select(
          "id, invited_name, email, role_id, status, expires_at, created_at",
        )
        .eq("organization_id", organization.id)
        .eq("incubator_id", incubator.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
  if (
    membershipsResult.error ||
    rolesResult.error ||
    assignmentsResult.error ||
    invitationsResult.error
  )
    throw new Error("Falha ao consultar a equipe da incubadora.");

  const memberships = membershipsResult.data ?? [];
  const userIds = memberships.map((membership) => membership.user_id);
  const profilesResult = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds)
    : { data: [], error: null };
  if (profilesResult.error)
    throw new Error("Falha ao consultar os perfis da equipe.");

  const profiles = profilesResult.data ?? [];
  const people = memberships.map((membership) => {
    const profile = profiles.find((item) => item.id === membership.user_id);
    return {
      membershipId: membership.id,
      userId: membership.user_id,
      displayName: profile?.display_name ?? profile?.email ?? "Pessoa sem nome",
      email: profile?.email ?? "E-mail não disponível",
    };
  });

  const logoUrl = incubator.logo_path
    ? ((
        await supabase.storage
          .from("incubator-logos")
          .createSignedUrl(incubator.logo_path, 60 * 60)
      ).data?.signedUrl ?? null)
    : null;

  return (
    <IncubatorPeopleManagement
      view={view as "operacao" | "equipe" | "convites"}
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      incubatorName={incubator.name}
      incubatorSettings={{
        name: incubator.name,
        timezone: incubator.timezone,
        locale: incubator.locale,
        settings: incubator.settings,
        kind: incubator.kind,
        customKind: incubator.custom_kind,
        legalName: incubator.legal_name,
        description: incubator.short_description,
        logoUrl,
        contactEmail: incubator.contact_email,
        phone: incubator.phone,
        website: incubator.website_url,
        city: incubator.city,
        state: incubator.state,
        countryCode: incubator.country_code,
        responsibleName: incubator.responsible_name,
      }}
      people={people}
      roles={rolesResult.data ?? []}
      assignments={(assignmentsResult.data ?? []).map((assignment) => ({
        id: assignment.id,
        membershipId: assignment.membership_id,
        roleId: assignment.role_id,
      }))}
      invitations={invitationsResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
