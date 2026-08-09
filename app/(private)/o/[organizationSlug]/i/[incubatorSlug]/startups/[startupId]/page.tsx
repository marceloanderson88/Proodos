import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  History,
  MapPin,
  PencilLine,
  Rocket,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

const stageLabels: Record<string, string> = {
  idea: "Ideia",
  validation: "Validação",
  operation: "Operação",
  traction: "Tração",
  scale: "Escala",
  graduated: "Graduada",
};
const statusLabels: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  graduated: "Graduada",
  withdrawn: "Desligada",
  archived: "Arquivada",
};
const roleLabels: Record<string, string> = {
  founder: "Fundador(a)",
  cofounder: "Cofundador(a)",
  representative: "Representante",
  employee: "Colaborador(a)",
  advisor: "Conselheiro(a)",
  other: "Outro",
};

export const dynamic = "force-dynamic";

export default async function StartupProfilePage({
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
  const [
    startupResult,
    membersResult,
    enrollmentsResult,
    historyResult,
    assessmentsResult,
  ] = await Promise.all([
    context.supabase
      .from("startups")
      .select(
        "id, code, name, legal_name, tax_id, sector, business_model, stage, status, city, state, country_code, website_url, created_at, updated_at",
      )
      .eq("organization_id", context.organization.id)
      .eq("incubator_id", context.incubator.id)
      .eq("id", startupId)
      .is("deleted_at", null)
      .maybeSingle(),
    context.supabase
      .from("startup_members")
      .select(
        "id, full_name, email, role, role_title, is_representative, status, joined_on",
      )
      .eq("organization_id", context.organization.id)
      .eq("startup_id", startupId)
      .order("is_representative", { ascending: false })
      .order("full_name"),
    context.supabase
      .from("startup_enrollments")
      .select("id, cohort_id, status, source, entry_date, exit_date")
      .eq("organization_id", context.organization.id)
      .eq("startup_id", startupId)
      .order("entry_date", { ascending: false }),
    context.supabase
      .from("startup_history")
      .select("id, event_type, title, occurred_at, metadata")
      .eq("organization_id", context.organization.id)
      .eq("startup_id", startupId)
      .order("occurred_at", { ascending: false })
      .limit(30),
    context.supabase
      .from("diagnostic_assessments")
      .select(
        "id, cycle_label, execution_mode, status, self_score, validated_score, evidence_coverage, updated_at",
      )
      .eq("organization_id", context.organization.id)
      .eq("incubator_id", context.incubator.id)
      .eq("startup_id", startupId)
      .order("updated_at", { ascending: false }),
  ]);
  if (!startupResult.data) notFound();
  if (
    [
      membersResult.error,
      enrollmentsResult.error,
      historyResult.error,
      assessmentsResult.error,
    ].some(Boolean)
  )
    throw new Error("Falha ao carregar o perfil da startup.");
  const startup = startupResult.data;
  const cohortIds = (enrollmentsResult.data ?? []).map(
    (item) => item.cohort_id,
  );
  const { data: cohorts } = cohortIds.length
    ? await context.supabase
        .from("cohorts")
        .select("id, name, program_id")
        .eq("organization_id", context.organization.id)
        .in("id", cohortIds)
    : { data: [] };
  const programIds = (cohorts ?? []).map((item) => item.program_id);
  const { data: programs } = programIds.length
    ? await context.supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", context.organization.id)
        .in("id", programIds)
    : { data: [] };
  const cohortMap = new Map((cohorts ?? []).map((item) => [item.id, item]));
  const programMap = new Map(
    (programs ?? []).map((item) => [item.id, item.name]),
  );
  const listPath = `/o/${organizationSlug}/i/${incubatorSlug}/startups`;
  const assessmentBase = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos/startups/${startupId}`;

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={listPath}
          className="inline-flex items-center gap-2 text-sm font-extrabold text-[#751118] hover:underline"
        >
          <ArrowLeft className="size-4" /> Portfólio de startups
        </Link>
        <Link
          href={`${listPath}/${startupId}/editar`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#751118]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#751118] shadow-sm hover:bg-[#fff7f2]"
        >
          <PencilLine className="size-4" /> Editar startup
        </Link>
      </div>
      <header className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#5c0c12,#79141b)] px-7 py-8 text-white shadow-[0_22px_55px_rgb(63_9_13/17%)] sm:px-9">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-[1.35rem] border border-white/12 bg-white/10">
              <Rocket className="size-8 text-[#f4c47a]" />
            </span>
            <div>
              <p className="text-xs font-black tracking-[0.15em] text-white/55 uppercase">
                {startup.code}
              </p>
              <h1 className="mt-1 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                {startup.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                {startup.business_model ??
                  "Modelo de negócio ainda não descrito."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">
              {stageLabels[startup.stage] ?? startup.stage}
            </span>
            <span className="rounded-full bg-[#f4c47a] px-3 py-1.5 text-xs font-black text-[#5c0c12]">
              {statusLabels[startup.status] ?? startup.status}
            </span>
          </div>
        </div>
      </header>
      <FeedbackBanner
        success={firstSearchValue(feedback.success)}
        error={firstSearchValue(feedback.error)}
      />
      <nav
        aria-label="Seções do perfil"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-[#751118]/10 bg-white p-1.5 shadow-sm"
      >
        {[
          ["visao-geral", "Visão geral"],
          ["equipe", "Equipe"],
          ["programas", "Programas e turmas"],
          ["diagnosticos", "Diagnósticos"],
          ["historico", "Histórico"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-xl px-4 py-2.5 text-xs font-extrabold whitespace-nowrap text-[#6d5652] hover:bg-[#fbefe7] hover:text-[#751118]"
          >
            {label}
          </a>
        ))}
      </nav>

      <section
        id="visao-geral"
        className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <article className="dashboard-card rounded-[1.7rem] p-6">
          <h2 className="operational-heading text-2xl text-[#3f090d]">
            Identidade do empreendimento
          </h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-black text-[#907f78] uppercase">
                Razão social
              </dt>
              <dd className="mt-1 font-bold text-[#493432]">
                {startup.legal_name ?? "Não informada"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-black text-[#907f78] uppercase">
                CNPJ ou registro
              </dt>
              <dd className="mt-1 font-bold text-[#493432]">
                {startup.tax_id ?? "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-black text-[#907f78] uppercase">
                Setor
              </dt>
              <dd className="mt-1 font-bold text-[#493432]">
                {startup.sector ?? "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-black text-[#907f78] uppercase">
                Localização
              </dt>
              <dd className="mt-1 flex items-center gap-2 font-bold text-[#493432]">
                <MapPin className="size-4 text-[#921a20]" />
                {startup.city
                  ? `${startup.city}${startup.state ? `, ${startup.state}` : ""}`
                  : "Não informada"}
              </dd>
            </div>
          </dl>
          {startup.website_url ? (
            <a
              href={startup.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#751118] hover:underline"
            >
              Acessar site <ExternalLink className="size-4" />
            </a>
          ) : null}
        </article>
        <article className="dashboard-card rounded-[1.7rem] p-6">
          <h2 className="operational-heading text-2xl text-[#3f090d]">
            Resumo operacional
          </h2>
          <dl className="mt-5 space-y-4">
            {[
              [
                UsersRound,
                "Pessoas ativas",
                String(
                  (membersResult.data ?? []).filter(
                    (item) => item.status === "active",
                  ).length,
                ),
              ],
              [
                Building2,
                "Vínculos com programas",
                String((enrollmentsResult.data ?? []).length),
              ],
              [
                Activity,
                "Diagnósticos",
                String((assessmentsResult.data ?? []).length),
              ],
              [
                CalendarDays,
                "Última atualização",
                new Intl.DateTimeFormat("pt-BR").format(
                  new Date(startup.updated_at),
                ),
              ],
            ].map(([Icon, label, value]) => {
              const IconComponent = Icon as typeof Activity;
              return (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-4 border-b border-[#751118]/8 pb-4 last:border-0"
                >
                  <span className="flex items-center gap-2 text-sm text-[#786762]">
                    <IconComponent className="size-4 text-[#921a20]" />
                    {String(label)}
                  </span>
                  <strong className="text-[#3f090d]">{String(value)}</strong>
                </div>
              );
            })}
          </dl>
        </article>
      </section>

      <section id="equipe" className="dashboard-card rounded-[1.7rem] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[#921a20] uppercase">
              Pessoas
            </p>
            <h2 className="operational-heading mt-1 text-2xl text-[#3f090d]">
              Equipe da startup
            </h2>
          </div>
          <span className="rounded-full bg-[#fbefe7] px-3 py-1.5 text-xs font-black text-[#751118]">
            {(membersResult.data ?? []).length}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(membersResult.data ?? []).length ? (
            (membersResult.data ?? []).map((member) => (
              <article
                key={member.id}
                className="rounded-2xl border border-[#751118]/10 bg-[#fffaf6] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#3f090d]">
                      {member.full_name}
                    </h3>
                    <p className="mt-1 text-xs text-[#7b6964]">
                      {member.role_title ??
                        roleLabels[member.role] ??
                        member.role}
                    </p>
                    {member.email ? (
                      <p className="mt-2 text-xs text-[#8d7b75]">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  {member.is_representative ? (
                    <span className="rounded-full bg-[#e8f5e9] px-2.5 py-1 text-[0.62rem] font-black text-[#28713c]">
                      Representante
                    </span>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#806f69]">Nenhuma pessoa vinculada.</p>
          )}
        </div>
      </section>

      <section id="programas" className="dashboard-card rounded-[1.7rem] p-6">
        <p className="text-xs font-black tracking-[0.12em] text-[#921a20] uppercase">
          Participação
        </p>
        <h2 className="operational-heading mt-1 text-2xl text-[#3f090d]">
          Programas e turmas
        </h2>
        <div className="mt-5 space-y-3">
          {(enrollmentsResult.data ?? []).length ? (
            (enrollmentsResult.data ?? []).map((enrollment) => {
              const cohort = cohortMap.get(enrollment.cohort_id);
              return (
                <article
                  key={enrollment.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[#751118]/10 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h3 className="font-black text-[#3f090d]">
                      {cohort
                        ? (programMap.get(cohort.program_id) ?? "Programa")
                        : "Programa"}
                    </h3>
                    <p className="mt-1 text-sm text-[#766868]">
                      {cohort?.name ?? "Turma indisponível"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="rounded-full bg-[#fbefe7] px-3 py-1 text-xs font-black text-[#751118]">
                      {enrollment.status}
                    </span>
                    <p className="mt-2 text-xs text-[#8a7974]">
                      Entrada em{" "}
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(`${enrollment.entry_date}T12:00:00`),
                      )}
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-[#806f69]">
              A startup ainda não participa de uma turma.
            </p>
          )}
        </div>
      </section>

      <section
        id="diagnosticos"
        className="dashboard-card rounded-[1.7rem] p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[#921a20] uppercase">
              Evolução
            </p>
            <h2 className="operational-heading mt-1 text-2xl text-[#3f090d]">
              Diagnósticos da startup
            </h2>
          </div>
          {(assessmentsResult.data ?? []).length > 1 ? (
            <Link
              href={`${assessmentBase}/historico`}
              className="text-sm font-extrabold text-[#751118] hover:underline"
            >
              Comparar ciclos
            </Link>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(assessmentsResult.data ?? []).length ? (
            (assessmentsResult.data ?? []).map((assessment) => (
              <Link
                key={assessment.id}
                href={`${assessmentBase}/avaliacoes/${assessment.id}`}
                className="rounded-2xl border border-[#751118]/10 bg-[#fffaf6] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#3f090d]">
                      {assessment.cycle_label}
                    </h3>
                    <p className="mt-1 text-xs text-[#806f69]">
                      {assessment.execution_mode === "self_assessment"
                        ? "Autodiagnóstico"
                        : "Diagnóstico facilitado"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-black text-[#751118]">
                    {assessment.status}
                  </span>
                </div>
                <div className="mt-4 flex gap-5 text-xs text-[#75635f]">
                  <span>
                    Declarado: <strong>{assessment.self_score ?? "—"}</strong>
                  </span>
                  <span>
                    Validado:{" "}
                    <strong>{assessment.validated_score ?? "—"}</strong>
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-[#806f69]">
              Nenhum diagnóstico aplicado.
            </p>
          )}
        </div>
      </section>

      <section id="historico" className="dashboard-card rounded-[1.7rem] p-6">
        <div className="flex items-center gap-3">
          <History className="size-5 text-[#921a20]" />
          <h2 className="operational-heading text-2xl text-[#3f090d]">
            Histórico
          </h2>
        </div>
        <ol className="mt-5 space-y-4">
          {(historyResult.data ?? []).length ? (
            (historyResult.data ?? []).map((event) => (
              <li
                key={event.id}
                className="relative border-l border-[#d9c5bc] pl-5 before:absolute before:top-1 before:-left-1.5 before:size-3 before:rounded-full before:bg-[#921a20]"
              >
                <h3 className="text-sm font-black text-[#4b0a0e]">
                  {event.title}
                </h3>
                <p className="mt-1 text-xs text-[#897873]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.occurred_at))}
                </p>
              </li>
            ))
          ) : (
            <li className="text-sm text-[#806f69]">
              Nenhum evento registrado.
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}
