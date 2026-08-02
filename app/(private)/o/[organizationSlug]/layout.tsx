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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Usuário";

  return (
    <AppShell
      organizationSlug={organizationSlug}
      user={{
        displayName,
        email: user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
