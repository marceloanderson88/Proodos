import { ArrowLeft, PencilLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateStartupAction } from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/startups/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { SubmitButton } from "@/components/m6/form-controls";
import { StartupFormFields } from "@/components/startups/startup-form-fields";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export default async function EditStartupPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    startupId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug, startupId }, feedback] =
    await Promise.all([params, searchParams]);
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { data: startup } = await context.supabase
    .from("startups")
    .select(
      "id, name, legal_name, tax_id, sector, business_model, stage, status, city, state, website_url",
    )
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("id", startupId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!startup) notFound();
  const detailPath = `/o/${organizationSlug}/i/${incubatorSlug}/startups/${startupId}`;
  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <Link
        href={detailPath}
        className="inline-flex items-center gap-2 text-sm font-extrabold text-[#751118] hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar ao perfil
      </Link>
      <header className="flex items-center gap-4 rounded-[2rem] bg-[#5c0c12] px-7 py-8 text-white sm:px-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
          <PencilLine className="size-6 text-[#f4c47a]" />
        </span>
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-white/60 uppercase">
            Editar cadastro
          </p>
          <h1 className="mt-1 text-4xl font-black">{startup.name}</h1>
        </div>
      </header>
      <FeedbackBanner error={firstSearchValue(feedback.error)} />
      <form
        action={updateStartupAction.bind(null, organizationSlug, incubatorSlug)}
        className="dashboard-card rounded-[1.7rem] p-6 sm:p-8"
      >
        <input type="hidden" name="startupId" value={startup.id} />
        <StartupFormFields
          includeStatus
          defaults={{
            name: startup.name,
            legalName: startup.legal_name ?? "",
            taxId: startup.tax_id ?? "",
            sector: startup.sector ?? "",
            businessModel: startup.business_model ?? "",
            stage: startup.stage,
            status: startup.status,
            city: startup.city ?? "",
            state: startup.state ?? "",
            websiteUrl: startup.website_url ?? "",
          }}
        />
        <div className="mt-7 flex justify-end">
          <SubmitButton>Salvar alterações</SubmitButton>
        </div>
      </form>
    </div>
  );
}
