import { ArrowLeft, Rocket } from "lucide-react";
import Link from "next/link";

import { createStartupDetailedAction } from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/startups/actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { SubmitButton } from "@/components/m6/form-controls";
import { StartupFormFields } from "@/components/startups/startup-form-fields";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export default async function NewStartupPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug }, feedback] = await Promise.all([
    params,
    searchParams,
  ]);
  const { incubator } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const listPath = `/o/${organizationSlug}/i/${incubatorSlug}/startups`;
  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <Link
        href={listPath}
        className="inline-flex items-center gap-2 text-sm font-extrabold text-[#751118] hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar ao portfólio
      </Link>
      <header className="rounded-[2rem] bg-[#5c0c12] px-7 py-8 text-white shadow-[0_22px_55px_rgb(63_9_13/16%)] sm:px-9">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Rocket className="size-6 text-[#f4c47a]" />
          </span>
          <div>
            <p className="text-xs font-black tracking-[0.14em] text-white/60 uppercase">
              {incubator.name}
            </p>
            <h1 className="mt-2 text-4xl font-black">Cadastrar startup</h1>
            <p className="mt-3 text-sm text-white/70">
              O empreendimento será criado diretamente nesta incubadora.
            </p>
          </div>
        </div>
      </header>
      <FeedbackBanner error={firstSearchValue(feedback.error)} />
      <form
        action={createStartupDetailedAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        )}
        className="dashboard-card rounded-[1.7rem] p-6 sm:p-8"
      >
        <StartupFormFields />
        <div className="mt-7 flex justify-end">
          <SubmitButton>Cadastrar startup</SubmitButton>
        </div>
      </form>
    </div>
  );
}
