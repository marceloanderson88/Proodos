import "server-only";

import { redirect } from "next/navigation";

import { organizationSlugSchema } from "@/lib/m6/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const incubatorSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getIncubatorServerContext(
  rawOrganizationSlug: string,
  rawIncubatorSlug: string,
) {
  const parsedOrganization =
    organizationSlugSchema.safeParse(rawOrganizationSlug);
  if (
    !parsedOrganization.success ||
    !incubatorSlugPattern.test(rawIncubatorSlug)
  )
    redirect("/o");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", parsedOrganization.data)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!organization) redirect("/o");

  const { data: incubator } = await supabase
    .from("incubators")
    .select(
      "id, name, slug, timezone, locale, settings, kind, custom_kind, legal_name, short_description, logo_path, contact_email, phone, website_url, city, state, country_code, responsible_name, onboarding_completed_at",
    )
    .eq("organization_id", organization.id)
    .eq("slug", rawIncubatorSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!incubator) redirect("/o");

  return { organization, incubator, supabase, user };
}

export async function redirectLegacyOrganizationRoute(
  organizationSlug: string,
  module: string,
  query = "",
) {
  const supabase = await createServerSupabaseClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", organizationSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!organization) redirect("/o");

  const { data: incubator } = await supabase
    .from("incubators")
    .select("slug")
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name")
    .limit(1)
    .maybeSingle();
  if (!incubator) redirect("/o");

  redirect(
    `/o/${organization.slug}/i/${incubator.slug}/${module}${query ? `?${query}` : ""}`,
  );
}
