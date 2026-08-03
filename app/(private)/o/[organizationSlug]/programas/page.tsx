import { redirectLegacyOrganizationRoute } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function LegacyProgramsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug }, feedback] = await Promise.all([
    params,
    searchParams,
  ]);
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(feedback)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) if (value) query.append(key, value);
  }
  await redirectLegacyOrganizationRoute(
    organizationSlug,
    "programas",
    query.toString(),
  );
}
