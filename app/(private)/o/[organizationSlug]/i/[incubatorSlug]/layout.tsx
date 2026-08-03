import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function IncubatorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
}) {
  const { organizationSlug, incubatorSlug } = await params;
  const { organization, incubator, supabase, user } =
    await getIncubatorServerContext(organizationSlug, incubatorSlug);
  const [{ data: profile }, { data: incubators }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("incubators")
      .select("id, name, slug")
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
  ]);
  const availableIncubators = incubators ?? [];
  if (!availableIncubators.some((item) => item.id === incubator.id))
    redirect("/o");

  return (
    <AppShell
      organization={organization}
      currentIncubator={incubator}
      incubators={availableIncubators}
      user={{
        id: user.id,
        displayName:
          profile?.display_name ?? user.email?.split("@")[0] ?? "Usuário",
        email: user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
