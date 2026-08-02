import { AppShell } from "@/components/layout/app-shell";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  return <AppShell organizationSlug={organizationSlug}>{children}</AppShell>;
}
