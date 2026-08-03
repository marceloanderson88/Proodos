import { redirectLegacyOrganizationRoute } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function LegacyDashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  await redirectLegacyOrganizationRoute(organizationSlug, "dashboard");
}
