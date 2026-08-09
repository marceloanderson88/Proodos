import { NextResponse } from "next/server";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      organizationSlug: string;
      incubatorSlug: string;
      campaignId: string;
    }>;
  },
) {
  const { organizationSlug, incubatorSlug, campaignId } = await params;
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
  };
  const [
    campaignResult,
    participantsResult,
    assessmentsResult,
    startupsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_campaigns")
      .select("id,name")
      .match({ ...scope, id: campaignId })
      .maybeSingle(),
    supabase
      .from("diagnostic_campaign_startups")
      .select("*")
      .match({ ...scope, campaign_id: campaignId })
      .order("created_at"),
    supabase
      .from("diagnostic_assessments")
      .select("*")
      .match({ ...scope, campaign_id: campaignId }),
    supabase.from("startups").select("id,name").match(scope),
    supabase.from("profiles").select("id,display_name,email"),
  ]);
  if (!campaignResult.data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (
    participantsResult.error ||
    assessmentsResult.error ||
    startupsResult.error ||
    profilesResult.error
  ) {
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
  const assessmentByParticipant = new Map(
    (assessmentsResult.data ?? []).map((item) => [
      item.campaign_startup_id,
      item,
    ]),
  );
  const startupById = new Map(
    (startupsResult.data ?? []).map((item) => [item.id, item]),
  );
  const profileById = new Map(
    (profilesResult.data ?? []).map((item) => [item.id, item]),
  );
  const header = [
    "Startup",
    "Status",
    "Avaliador",
    "Score declarado",
    "Score validado",
    "Classificação",
    "Gap médio",
    "Cobertura de evidências",
    "Enviado em",
    "Validado em",
  ];
  const rows = (participantsResult.data ?? []).map((participant) => {
    const assessment = assessmentByParticipant.get(participant.id);
    const startup = startupById.get(participant.startup_id);
    const evaluator = participant.evaluator_id
      ? profileById.get(participant.evaluator_id)
      : null;
    return [
      startup?.name ?? "",
      participant.status,
      evaluator?.display_name || evaluator?.email || "",
      assessment?.self_score ?? "",
      assessment?.validated_score ?? "",
      assessment?.classification_code ?? "",
      assessment?.average_gap ?? "",
      assessment?.evidence_coverage ?? "",
      assessment?.submitted_at ?? "",
      assessment?.validated_at ?? "",
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const filename = `${
    campaignResult.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "campanha"
  }.csv`;
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
