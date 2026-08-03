import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentOrganization } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", organizationSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  // A URL nunca concede acesso. Se RLS não devolveu o tenant, a rota é rejeitada.
  if (!currentOrganization) redirect("/o");

  return children;
}
