import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrganizationResolverPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=%2Fo");

  const [{ data: organizations }, { data: preferences }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, slug")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("user_preferences")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const availableOrganizations = organizations ?? [];
  const preferred = availableOrganizations.find(
    (organization) => organization.id === preferences?.active_organization_id,
  );
  const selected = preferred ?? availableOrganizations[0];

  if (!selected) redirect("/sem-organizacao");
  redirect(`/o/${selected.slug}/dashboard`);
}
