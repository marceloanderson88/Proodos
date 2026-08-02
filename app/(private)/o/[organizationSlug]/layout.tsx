import { AppShell } from "@/components/layout/app-shell";
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

  const [{ data: profile }, { data: organizations }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
  ]);

  const availableOrganizations = organizations ?? [];
  const currentOrganization = availableOrganizations.find(
    (organization) => organization.slug === organizationSlug,
  );

  // A URL nunca concede acesso. Se RLS não devolveu o tenant, a rota é rejeitada.
  if (!currentOrganization) redirect("/o");

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Usuário";

  return (
    <AppShell
      currentOrganization={currentOrganization}
      organizations={availableOrganizations}
      user={{
        id: user.id,
        displayName,
        email: user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
