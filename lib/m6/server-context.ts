import "server-only";

import { redirect } from "next/navigation";

import { organizationSlugSchema } from "@/lib/m6/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getM6ServerContext(rawOrganizationSlug: string) {
  const parsedSlug = organizationSlugSchema.safeParse(rawOrganizationSlug);
  if (!parsedSlug.success) redirect("/o");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", parsedSlug.data)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!organization) redirect("/o");

  return { organization, supabase, user };
}

export function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
