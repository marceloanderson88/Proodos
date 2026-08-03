import { IncubatorPeopleManagement } from "@/components/incubator/incubator-people-management";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

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
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );

  const [membershipsResult, rolesResult, assignmentsResult] = await Promise.all(
    [
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
    ],
  );
  if (membershipsResult.error || rolesResult.error || assignmentsResult.error)
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

  return (
    <IncubatorPeopleManagement
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      incubatorName={incubator.name}
      incubatorSettings={{
        timezone: incubator.timezone,
        locale: incubator.locale,
        settings: incubator.settings,
      }}
      people={people}
      roles={rolesResult.data ?? []}
      assignments={(assignmentsResult.data ?? []).map((assignment) => ({
        id: assignment.id,
        membershipId: assignment.membership_id,
        roleId: assignment.role_id,
      }))}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
