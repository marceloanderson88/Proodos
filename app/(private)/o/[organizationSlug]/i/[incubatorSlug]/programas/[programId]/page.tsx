import { notFound } from "next/navigation";

import { ProgramDetail } from "@/components/programs/program-detail";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function ProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    programId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug, programId }, feedback] =
    await Promise.all([params, searchParams]);
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const [
    programResult,
    typesResult,
    cohortsResult,
    membersResult,
    membershipsResult,
    diagnosticResult,
  ] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, type_id, name, code, status, description, objectives, target_audience, delivery_mode, duration_weeks, suggested_capacity, starts_on, ends_on, logo_path",
      )
      .eq("id", programId)
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("program_types")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id),
    supabase
      .from("cohorts")
      .select(
        "id, name, code, status, launches_on, starts_on, ends_on, capacity",
      )
      .eq("organization_id", organization.id)
      .eq("program_id", programId)
      .is("deleted_at", null)
      .order("starts_on", { ascending: false }),
    supabase
      .from("program_members")
      .select("id, user_id, role")
      .eq("organization_id", organization.id)
      .eq("program_id", programId)
      .order("created_at"),
    supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organization.id)
      .eq("status", "active"),
    supabase
      .from("diagnostic_templates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("status", "published"),
  ]);
  if (programResult.error || !programResult.data) notFound();
  if (
    typesResult.error ||
    cohortsResult.error ||
    membersResult.error ||
    membershipsResult.error ||
    diagnosticResult.error
  )
    throw new Error("Falha ao carregar o programa.");
  const program = programResult.data;

  const cohorts = cohortsResult.data ?? [];
  const cohortIds = cohorts.map((item) => item.id);
  const enrollments = cohortIds.length
    ? await supabase
        .from("startup_enrollments")
        .select("cohort_id")
        .eq("organization_id", organization.id)
        .in("cohort_id", cohortIds)
    : { data: [], error: null };
  if (enrollments.error)
    throw new Error("Falha ao consultar as matrículas do programa.");
  const userIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const profiles = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds)
    : { data: [], error: null };
  if (profiles.error)
    throw new Error("Falha ao consultar as pessoas disponíveis.");
  const logoUrl = program.logo_path
    ? ((
        await supabase.storage
          .from("program-logos")
          .createSignedUrl(program.logo_path, 60 * 60)
      ).data?.signedUrl ?? null)
    : null;
  const typeName =
    (typesResult.data ?? []).find((item) => item.id === program.type_id)
      ?.name ?? "Tipo indisponível";

  return (
    <ProgramDetail
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      program={{
        id: program.id,
        name: program.name,
        code: program.code,
        typeName,
        status: program.status,
        description: program.description,
        objectives: program.objectives,
        targetAudience: program.target_audience,
        deliveryMode: program.delivery_mode,
        durationWeeks: program.duration_weeks,
        suggestedCapacity: program.suggested_capacity,
        startsOn: program.starts_on,
        endsOn: program.ends_on,
        logoUrl,
      }}
      cohorts={cohorts.map((cohort) => ({
        id: cohort.id,
        name: cohort.name,
        code: cohort.code,
        status: cohort.status,
        launchesOn: cohort.launches_on,
        startsOn: cohort.starts_on,
        endsOn: cohort.ends_on,
        capacity: cohort.capacity,
        startupCount: (enrollments.data ?? []).filter(
          (item) => item.cohort_id === cohort.id,
        ).length,
      }))}
      people={(profiles.data ?? []).map((profile) => ({
        userId: profile.id,
        displayName: profile.display_name ?? profile.email ?? "Pessoa sem nome",
        email: profile.email ?? "",
      }))}
      members={(membersResult.data ?? []).map((member) => ({
        id: member.id,
        userId: member.user_id,
        role: member.role,
      }))}
      diagnosticTemplateCount={diagnosticResult.count ?? 0}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
