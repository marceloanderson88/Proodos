import {
  Archive,
  ArrowRight,
  Building2,
  Check,
  CircleDashed,
  Gauge,
  Mail,
  Plus,
  Rocket,
  RotateCcw,
  Trash2,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { manageIncubatorLifecycleAction } from "@/app/(private)/o/incubator-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { IncubatorCreateForm } from "@/components/organization/incubator-create-form";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";

type Incubator = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive" | "suspended";
  timezone: string;
  locale: string;
  kind:
    | "incubator"
    | "accelerator"
    | "innovation_hub"
    | "innovation_center"
    | "other";
  custom_kind: string | null;
  short_description: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  responsible_name: string | null;
  logoUrl: string | null;
  programCount: number;
  startupCount: number;
  peopleCount: number;
  pendingInvitationCount: number;
};

const kindLabels: Record<Incubator["kind"], string> = {
  incubator: "Incubadora",
  accelerator: "Aceleradora",
  innovation_hub: "Hub de inovação",
  innovation_center: "Núcleo de inovação",
  other: "Outra operação",
};

export function ProodosAdmin({
  organization,
  incubators,
  userName,
  success,
  error,
}: {
  organization: { id: string; name: string; slug: string };
  incubators: Incubator[];
  userName: string;
  success?: string;
  error?: string;
}) {
  const activeIncubators = incubators.filter(
    (item) => item.status === "active",
  );
  const totalPrograms = incubators.reduce(
    (total, item) => total + item.programCount,
    0,
  );
  const totalStartups = incubators.reduce(
    (total, item) => total + item.startupCount,
    0,
  );

  return (
    <main className="min-h-screen bg-[var(--sand-50)] text-[var(--text-strong)]">
      <header className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-5 px-5 py-4 sm:px-8">
          <div className="relative h-12 w-52 overflow-hidden sm:h-14 sm:w-60">
            <Image
              src="/brand/proodos-logo-transparent.png"
              alt="Proodos"
              fill
              priority
              sizes="240px"
              className="scale-[2.45] object-contain"
            />
          </div>
          <div className="ml-auto hidden text-right sm:block">
            <p className="text-xs font-extrabold text-[var(--wine-900)]">
              {userName}
            </p>
            <p className="text-[0.68rem] text-[var(--text-muted)]">
              Administração da rede
            </p>
          </div>
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="secondary">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-7 sm:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[var(--wine-950)] px-6 py-8 text-white shadow-[0_25px_80px_rgb(74_9_16/18%)] sm:px-9 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-12 lg:py-10">
          <div className="relative z-10">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[0.68rem] font-extrabold tracking-[0.16em] uppercase">
              <Gauge className="size-3.5 text-[#f0c275]" /> Central Proodos
            </p>
            <h1 className="max-w-3xl text-3xl leading-tight font-black tracking-[-0.035em] sm:text-5xl">
              Governe a rede. Cada incubadora conduz sua própria operação.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Cadastre identidades completas, acompanhe a implantação e entre no
              ambiente operacional sem misturar dados entre incubadoras.
            </p>
          </div>
          <dl className="relative z-10 mt-8 grid grid-cols-3 gap-3 lg:mt-0">
            {[
              [activeIncubators.length, "Incubadoras", Building2],
              [totalPrograms, "Programas", UsersRound],
              [totalStartups, "Startups", Rocket],
            ].map(([value, label, Icon]) => {
              const MetricIcon = Icon as typeof Building2;
              return (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                >
                  <MetricIcon
                    className="mb-3 size-5 text-[#f0c275]"
                    aria-hidden="true"
                  />
                  <dt className="text-[0.62rem] font-bold text-white/55 uppercase">
                    {String(label)}
                  </dt>
                  <dd className="mt-1 text-2xl font-black">{Number(value)}</dd>
                </div>
              );
            })}
          </dl>
          <div className="absolute -right-24 -bottom-40 size-[32rem] rounded-full bg-[#bd1644]/24 blur-3xl" />
        </section>

        <FeedbackBanner success={success} error={error} />

        <details
          className="surface-card group overflow-hidden"
          open={incubators.length === 0}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 marker:content-none sm:px-8">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
                <Plus className="size-5" />
              </span>
              <div>
                <p className="eyebrow">Nova operação</p>
                <h2 className="operational-heading mt-1 text-xl">
                  Cadastrar incubadora ou aceleradora
                </h2>
              </div>
            </div>
            <Plus className="size-5 text-[var(--wine-700)] transition group-open:rotate-45" />
          </summary>
          <div className="border-t border-[var(--border)] px-6 py-7 sm:px-8">
            <IncubatorCreateForm organizationId={organization.id} />
          </div>
        </details>

        <section aria-labelledby="incubator-network" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Rede Proodos</p>
              <h2
                id="incubator-network"
                className="mt-1 text-3xl font-black text-[var(--wine-950)]"
              >
                Incubadoras administradas
              </h2>
            </div>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              {incubators.length} cadastrada(s)
            </p>
          </div>

          {incubators.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <Building2 className="mx-auto size-9 text-[var(--clay-500)]" />
              <h3 className="operational-heading mt-4 text-lg">
                Nenhuma incubadora cadastrada
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Abra o cadastro acima para iniciar a primeira operação.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {incubators.map((incubator) => {
                const active = incubator.status === "active";
                const profileReady = Boolean(
                  incubator.short_description &&
                  incubator.contact_email &&
                  incubator.city &&
                  incubator.state &&
                  incubator.responsible_name,
                );
                const setupSteps = [
                  profileReady,
                  incubator.peopleCount > 0,
                  incubator.programCount > 0,
                ];
                const setupProgress = setupSteps.filter(Boolean).length;
                const hasOperationalData =
                  incubator.programCount > 0 ||
                  incubator.startupCount > 0 ||
                  incubator.peopleCount > 0;
                return (
                  <article
                    key={incubator.id}
                    className="surface-card overflow-hidden"
                  >
                    <div className="p-6 sm:p-7">
                      <div className="flex items-start gap-4">
                        <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                          {incubator.logoUrl ? (
                            <Image
                              src={incubator.logoUrl}
                              alt={`Logo de ${incubator.name}`}
                              fill
                              unoptimized
                              className="object-contain p-2"
                            />
                          ) : (
                            <Building2 className="size-6 text-[var(--wine-700)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={active ? "success" : "neutral"}>
                              {active ? "Ativa" : "Arquivada"}
                            </StatusBadge>
                            <span className="text-[0.68rem] font-bold text-[var(--text-muted)]">
                              {incubator.custom_kind ??
                                kindLabels[incubator.kind]}
                            </span>
                          </div>
                          <h3 className="mt-2 text-2xl font-black text-[var(--wine-950)]">
                            {incubator.name}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                            {incubator.short_description ??
                              "Perfil institucional ainda não concluído."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-[var(--surface-subtle)] p-4 text-center">
                        {[
                          [incubator.programCount, "Programas"],
                          [incubator.startupCount, "Startups"],
                          [incubator.peopleCount, "Papéis"],
                        ].map(([value, label]) => (
                          <div key={String(label)}>
                            <p className="text-xl font-black text-[var(--wine-950)]">
                              {value}
                            </p>
                            <p className="text-[0.62rem] font-bold text-[var(--text-muted)] uppercase">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {active && setupProgress < 3 && (
                        <div className="mt-5 rounded-2xl border border-[#dfb15f]/25 bg-[#fff5df] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-extrabold text-[#70440d]">
                              Implantação: {setupProgress}/3 etapas
                            </p>
                            {incubator.pendingInvitationCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#70440d]">
                                <Mail className="size-3" />{" "}
                                {incubator.pendingInvitationCount} convite(s)
                              </span>
                            )}
                          </div>
                          <ul className="mt-3 grid gap-2 text-xs text-[#70440d] sm:grid-cols-3">
                            {[
                              [profileReady, "Perfil"],
                              [incubator.peopleCount > 0, "Gestor"],
                              [incubator.programCount > 0, "Programa"],
                            ].map(([done, label]) => (
                              <li
                                key={String(label)}
                                className="flex items-center gap-2"
                              >
                                {done ? (
                                  <Check className="size-3.5" />
                                ) : (
                                  <CircleDashed className="size-3.5" />
                                )}{" "}
                                {String(label)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-6 py-4 sm:px-7">
                      {active ? (
                        <Link
                          href={`/o/${organization.slug}/i/${incubator.slug}/dashboard`}
                          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--wine-800)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--wine-700)]"
                        >
                          Acessar operação <ArrowRight className="size-4" />
                        </Link>
                      ) : (
                        <span />
                      )}
                      <div className="flex flex-wrap gap-2">
                        {active ? (
                          <>
                            <form action={manageIncubatorLifecycleAction}>
                              <input
                                type="hidden"
                                name="incubatorId"
                                value={incubator.id}
                              />
                              <input
                                type="hidden"
                                name="action"
                                value="archive"
                              />
                              <ConfirmSubmitButton
                                message={`Arquivar ${incubator.name}? O histórico será preservado.`}
                              >
                                <Archive className="size-4" /> Arquivar
                              </ConfirmSubmitButton>
                            </form>
                            {!hasOperationalData && (
                              <form action={manageIncubatorLifecycleAction}>
                                <input
                                  type="hidden"
                                  name="incubatorId"
                                  value={incubator.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="delete"
                                />
                                <ConfirmSubmitButton
                                  message={`Excluir definitivamente a incubadora vazia ${incubator.name}?`}
                                >
                                  <Trash2 className="size-4" /> Excluir vazia
                                </ConfirmSubmitButton>
                              </form>
                            )}
                          </>
                        ) : (
                          <form action={manageIncubatorLifecycleAction}>
                            <input
                              type="hidden"
                              name="incubatorId"
                              value={incubator.id}
                            />
                            <input
                              type="hidden"
                              name="action"
                              value="restore"
                            />
                            <Button type="submit" variant="secondary">
                              <RotateCcw className="size-4" /> Reativar
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
