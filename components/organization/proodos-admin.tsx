import {
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Gauge,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  Trash2,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  createIncubatorAction,
  manageIncubatorLifecycleAction,
  updateIncubatorAction,
} from "@/app/(private)/o/incubator-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";

type Incubator = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive" | "suspended";
  timezone: string;
  locale: string;
  programCount: number;
  startupCount: number;
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
  const metrics = [
    { value: activeIncubators.length, label: "Incubadoras", icon: Building2 },
    { value: totalPrograms, label: "Programas", icon: UsersRound },
    { value: totalStartups, label: "Startups", icon: Rocket },
  ];

  return (
    <main className="min-h-screen bg-[#f8f2ed] text-[#321416]">
      <header className="border-b border-[#74111a]/10 bg-[#fffaf6]/92 backdrop-blur-xl">
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
            <p className="text-xs font-black text-[#4b161a]">{userName}</p>
            <p className="text-[0.65rem] text-[#8a7470]">
              Administração Proodos
            </p>
          </div>
          <form action="/auth/logout" method="post">
            <button className="rounded-xl border border-[#74111a]/12 bg-white px-4 py-2.5 text-xs font-black text-[#74111a] hover:bg-[#74111a]/5">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-7 sm:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#4a0910] px-6 py-8 text-white shadow-[0_25px_80px_rgb(74_9_16/18%)] sm:px-9 lg:grid lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-12 lg:py-10">
          <div className="relative z-10">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[0.68rem] font-black tracking-[0.16em] uppercase">
              <Gauge className="size-3.5 text-[#f0c275]" /> Central
              administrativa
            </p>
            <h1 className="max-w-3xl text-3xl leading-tight font-black tracking-[-0.035em] sm:text-5xl">
              Uma visão do Proodos. Operações separadas por incubadora.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Cadastre e acompanhe incubadoras neste painel. Programas, turmas,
              startups e demais módulos ficam dentro do ambiente operacional de
              cada incubadora.
            </p>
          </div>
          <dl className="relative z-10 mt-8 grid grid-cols-3 gap-3 lg:mt-0">
            {metrics.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
              >
                <Icon
                  className="mb-3 size-5 text-[#f0c275]"
                  aria-hidden="true"
                />
                <dt className="text-[0.62rem] font-bold text-white/55 uppercase">
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-black">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="absolute -right-24 -bottom-40 size-[32rem] rounded-full bg-[#bd1644]/24 blur-3xl" />
        </section>

        <FeedbackBanner success={success} error={error} />

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="dashboard-card h-fit rounded-[1.7rem] p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f4dfd0] text-[#82151d]">
                <Plus className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-[#481014]">
                  Nova incubadora
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#806f69]">
                  O endereço interno é criado automaticamente a partir do nome.
                </p>
              </div>
            </div>
            <form action={createIncubatorAction} className="mt-6 space-y-4">
              <input
                type="hidden"
                name="organizationId"
                value={organization.id}
              />
              <Field label="Nome da incubadora" name="name">
                <input
                  className={inputClassName}
                  name="name"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="Ex.: Incubadora Sertão Maker"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fuso horário" name="timezone">
                  <input
                    className={inputClassName}
                    name="timezone"
                    defaultValue="America/Sao_Paulo"
                    required
                  />
                </Field>
                <Field label="Idioma" name="locale">
                  <select
                    className={inputClassName}
                    name="locale"
                    defaultValue="pt-BR"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                  </select>
                </Field>
              </div>
              <SubmitButton>Criar incubadora</SubmitButton>
            </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-black tracking-[0.15em] text-[#9a2930] uppercase">
                  Rede Proodos
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#481014]">
                  Incubadoras administradas
                </h2>
              </div>
              <p className="text-xs font-bold text-[#897872]">
                {incubators.length} cadastrada(s)
              </p>
            </div>

            {incubators.length === 0 ? (
              <div className="dashboard-card rounded-[1.7rem] border-dashed p-10 text-center">
                <Building2 className="mx-auto size-9 text-[#a67e72]" />
                <h3 className="mt-4 text-lg font-black text-[#481014]">
                  Nenhuma incubadora cadastrada
                </h3>
                <p className="mt-2 text-sm text-[#806f69]">
                  Use o formulário ao lado para iniciar a estrutura operacional.
                </p>
              </div>
            ) : (
              incubators.map((incubator) => {
                const hasOperationalData =
                  incubator.programCount > 0 || incubator.startupCount > 0;
                const active = incubator.status === "active";
                return (
                  <article
                    key={incubator.id}
                    className="dashboard-card overflow-hidden rounded-[1.7rem] p-0"
                  >
                    <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              active
                                ? "inline-flex items-center gap-1.5 rounded-full bg-[#e8f5e9] px-2.5 py-1 text-[0.65rem] font-black text-[#28713c]"
                                : "inline-flex items-center gap-1.5 rounded-full bg-[#eee8e5] px-2.5 py-1 text-[0.65rem] font-black text-[#74645f]"
                            }
                          >
                            <CheckCircle2 className="size-3" />{" "}
                            {active ? "Ativa" : "Arquivada"}
                          </span>
                          <span className="text-[0.68rem] font-bold text-[#9b8b85]">
                            /{incubator.slug}
                          </span>
                        </div>
                        <h3 className="mt-3 text-2xl font-black text-[#481014]">
                          {incubator.name}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-5 text-xs text-[#75635f]">
                          <span>
                            <strong className="text-[#481014]">
                              {incubator.programCount}
                            </strong>{" "}
                            programas
                          </span>
                          <span>
                            <strong className="text-[#481014]">
                              {incubator.startupCount}
                            </strong>{" "}
                            startups
                          </span>
                          <span>{incubator.timezone}</span>
                        </div>
                      </div>
                      {active && (
                        <Link
                          href={`/o/${organization.slug}/i/${incubator.slug}/dashboard`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#74111a] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#74111a]/15 transition hover:-translate-y-0.5 hover:bg-[#921a20]"
                        >
                          Acessar incubadora <ArrowRight className="size-4" />
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-[#74111a]/8 bg-[#fcf8f4] px-6 py-4 sm:px-7">
                      <details>
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-black text-[#74111a] marker:content-none">
                          <Pencil className="size-3.5" /> Editar e gerenciar
                        </summary>
                        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                          <form
                            action={updateIncubatorAction}
                            className="grid gap-4 sm:grid-cols-3"
                          >
                            <input
                              type="hidden"
                              name="organizationId"
                              value={organization.id}
                            />
                            <input
                              type="hidden"
                              name="incubatorId"
                              value={incubator.id}
                            />
                            <Field label="Nome" name={`name-${incubator.id}`}>
                              <input
                                className={inputClassName}
                                name="name"
                                defaultValue={incubator.name}
                                required
                              />
                            </Field>
                            <Field
                              label="Fuso horário"
                              name={`timezone-${incubator.id}`}
                            >
                              <input
                                className={inputClassName}
                                name="timezone"
                                defaultValue={incubator.timezone}
                                required
                              />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                              <Field
                                label="Idioma"
                                name={`locale-${incubator.id}`}
                              >
                                <select
                                  className={inputClassName}
                                  name="locale"
                                  defaultValue={incubator.locale}
                                >
                                  <option value="pt-BR">
                                    Português (Brasil)
                                  </option>
                                </select>
                              </Field>
                              <SubmitButton>Salvar</SubmitButton>
                            </div>
                          </form>
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
                                  <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#a6242b]/15 bg-white px-4 py-3 text-xs font-black text-[#8a171e] hover:bg-[#fbecec]">
                                    <Archive className="size-4" /> Arquivar
                                  </button>
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
                                    <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#a6242b]/15 bg-white px-4 py-3 text-xs font-black text-[#8a171e] hover:bg-[#fbecec]">
                                      <Trash2 className="size-4" /> Excluir
                                      vazia
                                    </button>
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
                                <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#37734a]/15 bg-white px-4 py-3 text-xs font-black text-[#28633a] hover:bg-[#edf7ef]">
                                  <RotateCcw className="size-4" /> Reativar
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
