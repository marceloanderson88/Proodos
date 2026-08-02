import { ProgramsWorkspace } from "@/components/m6/programs-workspace";
import { firstSearchValue, getM6ServerContext } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({
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
  const { organization, supabase } = await getM6ServerContext(organizationSlug);

  const [incubatorsResult, typesResult, programsResult, cohortsResult] =
    await Promise.all([
      supabase
        .from("incubators")
        .select("id, name")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("program_types")
        .select("id, name, incubator_id")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("programs")
        .select(
          "id, incubator_id, type_id, name, code, status, starts_on, ends_on",
        )
        .eq("organization_id", organization.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("cohorts")
        .select(
          "id, program_id, name, code, status, starts_on, ends_on, capacity",
        )
        .eq("organization_id", organization.id)
        .is("deleted_at", null)
        .order("starts_on", { ascending: false, nullsFirst: false }),
    ]);

  const firstError = [
    incubatorsResult.error,
    typesResult.error,
    programsResult.error,
    cohortsResult.error,
  ].find(Boolean);
  if (firstError) throw new Error("Falha ao consultar programas autorizados.");

  return (
    <ProgramsWorkspace
      organizationSlug={organizationSlug}
      incubators={incubatorsResult.data ?? []}
      programTypes={typesResult.data ?? []}
      programs={programsResult.data ?? []}
      cohorts={cohortsResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
