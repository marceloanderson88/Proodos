"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  FileCheck2,
  FolderTree,
  Gauge,
  Link2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { calculateCerneCoverage } from "@/lib/cerne/metrics";
import type {
  CerneScope,
  CerneView,
  CerneWorkspaceData,
} from "@/lib/cerne/types";
import { cn } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;
type Props = {
  view: CerneView;
  data: CerneWorkspaceData;
  currentUserId: string;
  timezone: string;
  success?: string;
  error?: string;
  prefill: {
    sourceType?: string;
    sourceId?: string;
    sourceName?: string;
    practice?: string;
  };
  actions: {
    createCycle: FormAction;
    registerEvidence: FormAction;
    assignOwner: FormAction;
    acknowledgeAlert: FormAction;
    assignReviewer: FormAction;
    acceptConfidentiality: FormAction;
    reviewEvidence: FormAction;
    saveActionDecision: FormAction;
    adjustEvidenceSlot: FormAction;
    refreshAlerts: () => void | Promise<void>;
  };
};

const field =
  "h-11 w-full rounded-xl border border-[#751118]/15 bg-white px-3 text-sm text-[#321013] outline-none transition focus:border-[#951b23] focus:ring-2 focus:ring-[#951b23]/10";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#8f111a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f0d14]";

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-[#751118]/10 bg-white p-5 shadow-[0_18px_50px_rgba(76,18,23,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#751118]/20 bg-[#fbf6f1] px-5 py-10 text-center text-sm text-[#765f60]">
      {children}
    </div>
  );
}

function localDateTimeValue(value: string | null, timeZone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function CerneWorkspace({
  view,
  data,
  currentUserId,
  timezone,
  success,
  error,
  prefill,
  actions,
}: Props) {
  const activeCycle =
    data.cycles.find(
      (cycle) => cycle.status !== "completed" && cycle.status !== "cancelled",
    ) ?? data.cycles[0];
  const cycleSlots = data.slots.filter(
    (slot) => slot.cycle_id === activeCycle?.id,
  );
  const coverage = calculateCerneCoverage(cycleSlots);
  const openAlerts = data.alerts.filter(
    (alert) => alert.cycle_id === activeCycle?.id,
  );
  const failedSync = data.evidences.filter(
    (evidence) =>
      evidence.cycle_id === activeCycle?.id &&
      evidence.sync_status === "failed",
  ).length;

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#3b090d] px-6 py-7 text-white shadow-[0_24px_70px_rgba(74,10,16,0.18)] sm:px-8">
        <div className="absolute -top-24 -right-14 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[.15em] text-[#f1c9aa]">
              <ShieldCheck className="h-4 w-4" /> GOVERNANÇA DE EVIDÊNCIAS
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Dossiê CERNE
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Acompanhe práticas, responsáveis, evidências e prontidão para
              avaliação em um único ciclo auditável.
            </p>
          </div>
          {activeCycle ? (
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/8 p-2 text-center">
              <MetricDark
                label="Ciclo"
                value={String(activeCycle.reference_year)}
              />
              <MetricDark
                label="CERNE"
                value={String(activeCycle.target_level)}
              />
              <MetricDark
                label="Validado"
                value={`${coverage.approvedPercent}%`}
              />
            </div>
          ) : null}
        </div>
      </header>
      {(success || error) && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {error ?? success}
        </div>
      )}
      {view === "overview" && (
        <Overview
          data={data}
          activeCycleId={activeCycle?.id}
          coverage={coverage}
          openAlerts={openAlerts.length}
          failedSync={failedSync}
          action={actions.createCycle}
        />
      )}
      {view === "matrix" && (
        <Matrix
          data={data}
          activeCycleId={activeCycle?.id}
          action={actions.assignOwner}
        />
      )}
      {view === "plan" && (
        <EvidencePlan
          data={data}
          activeCycleId={activeCycle?.id}
          timezone={timezone}
          actions={actions}
        />
      )}
      {view === "evidences" && (
        <Evidences
          data={data}
          activeCycleId={activeCycle?.id}
          prefill={prefill}
          action={actions.registerEvidence}
        />
      )}
      {view === "alerts" && (
        <Alerts
          alerts={openAlerts}
          action={actions.acknowledgeAlert}
          refreshAction={actions.refreshAlerts}
        />
      )}
      {view === "drive" && (
        <Drive data={data} activeCycleId={activeCycle?.id} />
      )}
      {view === "review" && (
        <Review
          data={data}
          activeCycleId={activeCycle?.id}
          currentUserId={currentUserId}
          actions={actions}
        />
      )}
    </main>
  );
}

function MetricDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-xl px-3 py-2">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] tracking-wider text-white/55 uppercase">
        {label}
      </div>
    </div>
  );
}

function Overview({
  data,
  activeCycleId,
  coverage,
  openAlerts,
  failedSync,
  action,
}: {
  data: CerneWorkspaceData;
  activeCycleId?: string;
  coverage: ReturnType<typeof calculateCerneCoverage>;
  openAlerts: number;
  failedSync: number;
  action: FormAction;
}) {
  const practiceStats = data.practices.map((practice) => ({
    practice,
    ...calculateCerneCoverage(
      data.slots.filter(
        (slot) =>
          slot.cycle_id === activeCycleId &&
          slot.practice_code === practice.code,
      ),
    ),
  }));
  const reviewedActions = data.actionDecisions.filter(
    (decision) =>
      decision.cycle_id === activeCycleId && decision.status !== "to_review",
  ).length;
  const actionReviewPercent = data.actions.length
    ? Math.round((reviewedActions / data.actions.length) * 100)
    : 0;
  const processStats = [
    ...new Map(
      data.practices.map((practice) => [
        practice.process_code,
        {
          code: practice.process_code,
          name: practice.process_name,
        },
      ]),
    ).values(),
  ].map((process) => ({
    ...process,
    ...calculateCerneCoverage(
      data.slots.filter(
        (slot) =>
          slot.cycle_id === activeCycleId &&
          data.practices.some(
            (practice) =>
              practice.code === slot.practice_code &&
              practice.process_code === process.code,
          ),
      ),
    ),
  }));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          icon={Gauge}
          label="Cobertura validada"
          value={`${coverage.approvedPercent}%`}
          detail={`${coverage.approved} de ${coverage.total} requisitos`}
        />
        <Kpi
          icon={FileCheck2}
          label="Evidências enviadas"
          value={`${coverage.submittedPercent}%`}
          detail="registro no momento da prática"
        />
        <Kpi
          icon={AlertTriangle}
          label="Alertas abertos"
          value={String(openAlerts)}
          detail="prazos, rejeições e responsáveis"
          danger={openAlerts > 0}
        />
        <Kpi
          icon={FolderTree}
          label="Falhas no Drive"
          value={String(failedSync)}
          detail="sincronização preparada"
          danger={failedSync > 0}
        />
        <Kpi
          icon={ClipboardList}
          label="Plano revisado"
          value={`${actionReviewPercent}%`}
          detail={`${reviewedActions} de ${data.actions.length} ações`}
        />
      </div>
      {!activeCycleId ? (
        <Card>
          <h2 className="font-serif text-2xl font-bold text-[#401014]">
            Inicie o ciclo de conformidade
          </h2>
          <p className="mt-1 text-sm text-[#765f60]">
            Ao criar o ciclo, a matriz das 20 práticas e a árvore lógica do
            Drive são geradas automaticamente.
          </p>
          {data.canManage && (
            <form action={action} className="mt-5 grid gap-3 md:grid-cols-5">
              <input
                name="name"
                className={field}
                placeholder="Ciclo CERNE 2026"
                required
              />
              <input
                name="referenceYear"
                type="number"
                defaultValue={new Date().getFullYear()}
                className={field}
                required
              />
              <select name="targetLevel" className={field}>
                <option value="1">CERNE 1</option>
                <option value="2">CERNE 1 + 2</option>
              </select>
              <input name="startsOn" type="date" className={field} required />
              <input name="endsOn" type="date" className={field} required />
              <button
                className={cn(button, "md:col-span-5 md:justify-self-start")}
              >
                Criar ciclo e pastas
              </button>
            </form>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
          <Card>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
                  Mapa de prontidão
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
                  20 práticas-chave
                </h2>
              </div>
              <Link
                href="?view=matrix"
                className="text-sm font-semibold text-[#8f111a]"
              >
                Abrir matriz →
              </Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {processStats.map((process) => (
                <div
                  key={process.code}
                  className="rounded-2xl border border-[#751118]/8 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black tracking-[.14em] text-[#9a4a36] uppercase">
                        Processo {process.code}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#401014]">
                        {process.name}
                      </p>
                    </div>
                    <strong className="text-lg text-[#8f111a]">
                      {process.approvedPercent}%
                    </strong>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eadbd3]">
                    <div
                      className="h-full rounded-full bg-[#a5222b]"
                      style={{ width: `${process.approvedPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {practiceStats.map(({ practice, approvedPercent }) => (
                <div
                  key={practice.code}
                  className="rounded-xl bg-[#fbf6f1] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-[#401014]">
                      {practice.code} · {practice.name}
                    </span>
                    <span className="text-xs font-bold text-[#8f111a]">
                      {approvedPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadbd3]">
                    <div
                      className="h-full rounded-full bg-[#a5222b]"
                      style={{ width: `${approvedPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
              Próximas ações
            </p>
            <div className="mt-4 space-y-3">
              <Quick
                href="?view=plan"
                icon={ClipboardList}
                title="Revisar plano"
                text={`${reviewedActions} de ${data.actions.length} ações consolidadas.`}
              />
              <Quick
                href="?view=evidences"
                icon={Link2}
                title="Registrar evidência"
                text="Vincule um arquivo externo ou item da plataforma."
              />
              <Quick
                href="?view=alerts"
                icon={AlertTriangle}
                title="Tratar alertas"
                text={`${openAlerts} pontos exigem atenção.`}
              />
              <Quick
                href="?view=review"
                icon={UserRoundCheck}
                title="Preparar banca"
                text="Convites, sigilo e pareceres por prática."
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
  danger,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#8d7474] uppercase">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-3xl font-bold",
              danger ? "text-[#bd252b]" : "text-[#401014]",
            )}
          >
            {value}
          </p>
        </div>
        <Icon
          className={cn(
            "h-5 w-5",
            danger ? "text-[#bd252b]" : "text-[#b76a45]",
          )}
        />
      </div>
      <p className="mt-2 text-xs text-[#8d7474]">{detail}</p>
    </Card>
  );
}
function Quick({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: typeof Gauge;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-xl border border-[#751118]/10 p-3 transition hover:border-[#951b23]/30 hover:bg-[#fbf6f1]"
    >
      <Icon className="mt-0.5 h-5 w-5 text-[#9a4a36]" />
      <div>
        <div className="flex items-center gap-1 text-sm font-semibold text-[#401014]">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
        </div>
        <p className="mt-0.5 text-xs leading-5 text-[#806c6d]">{text}</p>
      </div>
    </Link>
  );
}

function Matrix({
  data,
  activeCycleId,
  action,
}: {
  data: CerneWorkspaceData;
  activeCycleId?: string;
  action: FormAction;
}) {
  if (!activeCycleId)
    return <Empty>Crie um ciclo CERNE para abrir a matriz.</Empty>;
  return (
    <div className="space-y-5">
      {[1, 2].map((level) => {
        const practices = data.practices.filter((p) => p.level === level);
        if (!practices.length) return null;
        return (
          <Card key={level}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#401014] font-serif text-lg font-bold text-white">
                {level}
              </span>
              <div>
                <p className="text-xs font-bold tracking-widest text-[#9a4a36] uppercase">
                  Nível de maturidade
                </p>
                <h2 className="font-serif text-xl font-bold text-[#401014]">
                  CERNE {level}
                </h2>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#751118]/10 text-xs tracking-wider text-[#8d7474] uppercase">
                    <th className="pb-3">Prática</th>
                    <th className="pb-3">Processo</th>
                    <th className="pb-3">Cobertura</th>
                    <th className="pb-3">Responsável e situação</th>
                  </tr>
                </thead>
                <tbody>
                  {practices.map((practice) => {
                    const slots = data.slots.filter(
                      (s) =>
                        s.cycle_id === activeCycleId &&
                        s.practice_code === practice.code,
                    );
                    const metric = calculateCerneCoverage(slots);
                    const owner = data.owners.find(
                      (o) =>
                        o.cycle_id === activeCycleId &&
                        o.practice_code === practice.code,
                    );
                    return (
                      <tr
                        key={practice.code}
                        className="border-b border-[#751118]/7 align-top"
                      >
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-[#401014]">
                            {practice.code} · {practice.name}
                          </div>
                          <p className="mt-1 max-w-md text-xs leading-5 text-[#806c6d]">
                            {practice.description}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-[#684f51]">
                          {practice.process_name}
                        </td>
                        <td className="py-4 pr-4">
                          <div className="font-bold text-[#8f111a]">
                            {metric.approvedPercent}%
                          </div>
                          <div className="mt-1 text-xs text-[#8d7474]">
                            {metric.approved}/{metric.total} válidos
                          </div>
                        </td>
                        <td className="py-4">
                          {data.canManage ? (
                            <form
                              action={action}
                              className="grid grid-cols-[1fr_1fr_auto] gap-2"
                            >
                              <input
                                type="hidden"
                                name="cycleId"
                                value={activeCycleId}
                              />
                              <input
                                type="hidden"
                                name="practiceCode"
                                value={practice.code}
                              />
                              <select
                                name="userId"
                                defaultValue={owner?.responsible_user_id ?? ""}
                                className={field}
                              >
                                <option value="">Sem responsável</option>
                                {data.people.map((person) => (
                                  <option key={person.id} value={person.id}>
                                    {person.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="implementationStatus"
                                defaultValue={
                                  owner?.implementation_status ?? "to_validate"
                                }
                                className={field}
                              >
                                <option value="to_validate">A validar</option>
                                <option value="implementing">
                                  Em implantação
                                </option>
                                <option value="implemented">Implantada</option>
                                <option value="not_applicable">
                                  Não aplicável
                                </option>
                              </select>
                              <button className={button}>Salvar</button>
                            </form>
                          ) : (
                            <span className="text-[#684f51]">
                              {owner?.implementation_status ?? "A validar"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function EvidencePlan({
  data,
  activeCycleId,
  timezone,
  actions,
}: {
  data: CerneWorkspaceData;
  activeCycleId?: string;
  timezone: string;
  actions: Props["actions"];
}) {
  if (!activeCycleId)
    return (
      <Empty>Crie um ciclo CERNE para revisar o plano de evidências.</Empty>
    );
  const decisions = data.actionDecisions.filter(
    (decision) => decision.cycle_id === activeCycleId,
  );
  const reviewed = decisions.filter(
    (decision) => decision.status !== "to_review",
  ).length;
  const adjusted = decisions.filter(
    (decision) => decision.status === "adjusted",
  ).length;
  const optionalSlots = data.slots.filter(
    (slot) => slot.cycle_id === activeCycleId && slot.required === false,
  ).length;
  const reviewPercent = data.actions.length
    ? Math.round((reviewed / data.actions.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={ClipboardList}
          label="Ações revisadas"
          value={`${reviewPercent}%`}
          detail={`${reviewed} de ${data.actions.length} ações da planilha`}
        />
        <Kpi
          icon={Settings2}
          label="Ajustes aprovados"
          value={String(adjusted)}
          detail="periodicidade ou evidência mínima adaptada"
        />
        <Kpi
          icon={FileCheck2}
          label="Itens opcionais"
          value={String(optionalSlots)}
          detail="fora do denominador de prontidão"
        />
        <Kpi
          icon={ShieldCheck}
          label="Práticas cobertas"
          value={String(
            new Set(data.actions.map((action) => action.practice_code)).size,
          )}
          detail="catálogo consolidado CERNE I e II"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
              Revisão da equipe
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
              42 ações consolidadas
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#765f60]">
              Preserve a referência do manual, aceite a simplificação sugerida
              ou registre uma adaptação justificada para este ciclo.
            </p>
          </div>
          <Link href="?view=evidences" className={button}>
            Registrar evidência
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {data.actions.map((catalogAction) => {
            const decision = decisions.find(
              (item) => item.action_id === catalogAction.id,
            );
            return (
              <details
                key={catalogAction.id}
                className="group rounded-2xl border border-[#751118]/10 bg-[#fffdfb] open:bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[.16em] text-[#9a4a36] uppercase">
                      {catalogAction.action_code} ·{" "}
                      {catalogAction.periodicity_group}
                    </p>
                    <h3 className="mt-1 font-semibold text-[#401014]">
                      {catalogAction.action_name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold",
                      decision?.status === "accepted"
                        ? "bg-emerald-100 text-emerald-800"
                        : decision?.status === "adjusted"
                          ? "bg-blue-100 text-blue-800"
                          : decision?.status === "not_applicable"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {decision?.status === "accepted"
                      ? "Aceita"
                      : decision?.status === "adjusted"
                        ? "Ajustada"
                        : decision?.status === "not_applicable"
                          ? "Não aplicável"
                          : "A revisar"}
                  </span>
                </summary>
                <div className="grid gap-5 border-t border-[#751118]/8 p-4 lg:grid-cols-[1fr_1.1fr]">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-bold text-[#8d7474] uppercase">
                        Simplificação sugerida
                      </p>
                      <p className="mt-1 leading-6 text-[#684f51]">
                        {catalogAction.simplification_suggestion}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f7f2ee] p-4">
                      <p className="text-xs font-bold text-[#8d7474] uppercase">
                        Evidência mínima recomendada
                      </p>
                      <p className="mt-1 leading-6 text-[#401014]">
                        {catalogAction.minimum_evidence}
                      </p>
                    </div>
                    <p className="text-xs text-[#806c6d]">
                      Periodicidade original:{" "}
                      {catalogAction.original_periodicity ?? "Não informada"}
                    </p>
                  </div>
                  {data.canManage ? (
                    <form
                      action={actions.saveActionDecision}
                      className="grid gap-3"
                    >
                      <input
                        type="hidden"
                        name="cycleId"
                        value={activeCycleId}
                      />
                      <input
                        type="hidden"
                        name="actionId"
                        value={catalogAction.id}
                      />
                      <select
                        name="status"
                        defaultValue={
                          decision?.status === "to_review" || !decision
                            ? "accepted"
                            : decision.status
                        }
                        className={field}
                      >
                        <option value="accepted">Aceitar recomendação</option>
                        <option value="adjusted">Ajustar para o ciclo</option>
                        <option value="not_applicable">
                          Não se aplica neste ciclo
                        </option>
                      </select>
                      <input
                        name="periodicity"
                        defaultValue={
                          decision?.periodicity_override ??
                          catalogAction.periodicity_group ??
                          ""
                        }
                        className={field}
                        placeholder="Periodicidade adotada"
                      />
                      <textarea
                        name="minimumEvidence"
                        defaultValue={
                          decision?.minimum_evidence_override ??
                          catalogAction.minimum_evidence
                        }
                        rows={3}
                        className={cn(field, "h-auto py-3")}
                        placeholder="Evidência mínima adotada"
                      />
                      <input
                        name="decision"
                        defaultValue={decision?.decision ?? ""}
                        className={field}
                        placeholder="Decisão resumida da equipe"
                      />
                      <textarea
                        name="notes"
                        defaultValue={decision?.notes ?? ""}
                        rows={2}
                        className={cn(field, "h-auto py-3")}
                        placeholder="Justificativa ou observações"
                      />
                      <button className={cn(button, "justify-self-start")}>
                        Salvar revisão
                      </button>
                    </form>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </Card>

      <Card>
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
            Plano operacional
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
            Ajustar evidências planejadas
          </h2>
          <p className="mt-2 text-sm text-[#765f60]">
            Altere título, prazo e obrigatoriedade sem apagar o histórico do
            requisito original.
          </p>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {data.slots
            .filter((slot) => slot.cycle_id === activeCycleId)
            .map((slot) => (
              <form
                key={slot.id}
                action={actions.adjustEvidenceSlot}
                className="rounded-2xl border border-[#751118]/10 bg-[#fffdfb] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-[#8f111a]">
                    {slot.practice_code}
                  </span>
                  <Status status={slot.status} />
                </div>
                <input type="hidden" name="slotId" value={slot.id} />
                <input type="hidden" name="timezone" value={timezone} />
                <div className="mt-3 grid gap-3">
                  <input
                    name="title"
                    defaultValue={slot.title}
                    className={field}
                    required
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="dueAt"
                      type="datetime-local"
                      defaultValue={localDateTimeValue(slot.due_at, timezone)}
                      className={field}
                    />
                    <select
                      name="required"
                      defaultValue={slot.required === false ? "false" : "true"}
                      className={field}
                    >
                      <option value="true">Obrigatória</option>
                      <option value="false">Opcional neste ciclo</option>
                    </select>
                  </div>
                  <textarea
                    name="notes"
                    defaultValue={slot.adjustment_notes ?? ""}
                    rows={2}
                    className={cn(field, "h-auto py-3")}
                    placeholder="Justificativa do ajuste"
                  />
                  {data.canManage ? (
                    <button className={cn(button, "justify-self-start")}>
                      Salvar ajuste
                    </button>
                  ) : null}
                </div>
              </form>
            ))}
        </div>
      </Card>
    </div>
  );
}

function Evidences({
  data,
  activeCycleId,
  prefill,
  action,
}: {
  data: CerneWorkspaceData;
  activeCycleId?: string;
  prefill: Props["prefill"];
  action: FormAction;
}) {
  const [practice, setPractice] = useState(
    prefill.practice && data.practices.some((p) => p.code === prefill.practice)
      ? prefill.practice
      : (data.practices[0]?.code ?? ""),
  );
  const initialScope = (
    ["program", "cohort", "startup", "selection_call"] as string[]
  ).includes(prefill.sourceType ?? "")
    ? (prefill.sourceType as CerneScope)
    : "incubator";
  const [scope, setScope] = useState<CerneScope>(initialScope);
  const requirements = data.requirements.filter(
    (r) => r.practice_code === practice,
  );
  const entities =
    scope === "program"
      ? data.programs
      : scope === "cohort"
        ? data.cohorts
        : scope === "startup"
          ? data.startups
          : scope === "selection_call"
            ? data.calls
            : [];
  if (!activeCycleId)
    return <Empty>Crie um ciclo antes de registrar evidências.</Empty>;
  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <Card>
        <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
          Novo registro
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
          Adicionar ao dossiê
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#806c6d]">
          Registre a evidência quando a prática ocorrer. Itens de programas,
          turmas, startups e chamadas podem ser vinculados sem duplicar
          informação.
        </p>
        {data.canSubmit && (
          <form action={action} className="mt-5 space-y-3">
            <input type="hidden" name="cycleId" value={activeCycleId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#684f51]">
                Prática
                <select
                  name="practiceCode"
                  value={practice}
                  onChange={(e) => setPractice(e.target.value)}
                  className={cn(field, "mt-1")}
                >
                  {data.practices.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#684f51]">
                Evidência esperada
                <select
                  name="requirementId"
                  className={cn(field, "mt-1")}
                  required
                >
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.manual_gap ? " · complemento de governança" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              name="title"
              defaultValue={
                prefill.sourceName ? `Evidência — ${prefill.sourceName}` : ""
              }
              className={field}
              placeholder="Título da evidência"
              required
            />
            <textarea
              name="description"
              className={cn(field, "min-h-24 py-3")}
              placeholder="Contexto, resultado e período observado"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#684f51]">
                Contexto
                <select
                  name="scopeType"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as CerneScope)}
                  className={cn(field, "mt-1")}
                >
                  <option value="incubator">Incubadora</option>
                  <option value="program">Programa</option>
                  <option value="cohort">Turma</option>
                  <option value="startup">Startup</option>
                  <option value="selection_call">Chamada / seleção</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-[#684f51]">
                Item vinculado
                <select
                  name="scopeEntityId"
                  defaultValue={prefill.sourceId ?? ""}
                  className={cn(field, "mt-1")}
                  disabled={scope === "incubator"}
                >
                  <option value="">Selecione</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              type="hidden"
              name="sourceModule"
              value={prefill.sourceType ?? scope}
            />
            <input
              type="hidden"
              name="sourceEntityType"
              value={scope === "incubator" ? "" : scope}
            />
            <input
              type="hidden"
              name="sourceEntityId"
              value={scope === "incubator" ? "" : (prefill.sourceId ?? "")}
            />
            <label className="block text-xs font-semibold text-[#684f51]">
              Link do arquivo ou pasta no Drive
              <input
                name="externalUrl"
                type="url"
                className={cn(field, "mt-1")}
                placeholder="https://drive.google.com/..."
              />
            </label>
            <button className={button}>
              <FileCheck2 className="h-4 w-4" />
              Registrar evidência
            </button>
          </form>
        )}
      </Card>
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
              Linha do tempo
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
              Evidências recentes
            </h2>
          </div>
          <span className="text-sm text-[#806c6d]">
            {data.evidences.filter((e) => e.cycle_id === activeCycleId).length}{" "}
            registros
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {data.evidences
            .filter((e) => e.cycle_id === activeCycleId)
            .map((evidence) => (
              <div
                key={evidence.id}
                className="rounded-xl border border-[#751118]/10 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-[#9a4a36]">
                      {evidence.practice_code}
                    </div>
                    <h3 className="mt-1 font-semibold text-[#401014]">
                      {evidence.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#806c6d]">
                      {evidence.description || evidence.drive_path}
                    </p>
                  </div>
                  <Status status={evidence.status} />
                </div>
                {evidence.external_url && (
                  <a
                    href={evidence.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8f111a]"
                  >
                    Abrir fonte <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          {!data.evidences.some((e) => e.cycle_id === activeCycleId) && (
            <Empty>Nenhuma evidência registrada neste ciclo.</Empty>
          )}
        </div>
      </Card>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const ok = status === "approved";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
        ok
          ? "bg-emerald-100 text-emerald-800"
          : status === "rejected"
            ? "bg-red-100 text-red-800"
            : "bg-amber-100 text-amber-800",
      )}
    >
      {status === "submitted" ? "em análise" : status}
    </span>
  );
}

function Alerts({
  alerts,
  action,
  refreshAction,
}: {
  alerts: CerneWorkspaceData["alerts"];
  action: FormAction;
  refreshAction: () => void | Promise<void>;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
            Central de atenção
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
            Alertas e prazos
          </h2>
        </div>
        <form action={refreshAction}>
          <button
            className={cn(
              button,
              "bg-white text-[#8f111a] ring-1 ring-[#751118]/15 hover:bg-[#fbf6f1]",
            )}
          >
            <RefreshCw className="h-4 w-4" /> Atualizar alertas
          </button>
        </form>
      </div>
      <div className="mt-5 space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
              alert.severity === "critical"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50",
            )}
          >
            <div className="flex gap-3">
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-5 w-5",
                  alert.severity === "critical"
                    ? "text-red-600"
                    : "text-amber-600",
                )}
              />
              <div>
                <div className="text-xs font-bold tracking-wider text-[#9a4a36] uppercase">
                  {alert.practice_code ?? "Governança"}
                </div>
                <h3 className="font-semibold text-[#401014]">{alert.title}</h3>
                <p className="mt-1 text-sm text-[#684f51]">{alert.message}</p>
              </div>
            </div>
            {alert.status === "open" && (
              <form action={action}>
                <input type="hidden" name="alertId" value={alert.id} />
                <button className="rounded-lg border border-[#751118]/20 bg-white px-3 py-2 text-xs font-semibold text-[#751118]">
                  Reconhecer
                </button>
              </form>
            )}
          </div>
        ))}
        {!alerts.length && (
          <Empty>Nenhum alerta aberto. O ciclo está em dia.</Empty>
        )}
      </div>
    </Card>
  );
}

function Drive({
  data,
  activeCycleId,
}: {
  data: CerneWorkspaceData;
  activeCycleId?: string;
}) {
  const folders = data.folders.filter((f) => f.cycle_id === activeCycleId);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Card>
        <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
          Árvore documental
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
          Pastas preparadas para o Drive
        </h2>
        <div className="mt-5 max-h-[620px] space-y-1 overflow-auto rounded-2xl bg-[#301014] p-4 font-mono text-xs text-[#f7e8dc]">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 hover:bg-white/5"
            >
              <span className="truncate">{folder.logical_path}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase",
                  folder.sync_status === "synced"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-amber-400/15 text-amber-200",
                )}
              >
                {folder.sync_status}
              </span>
            </div>
          ))}
          {!folders.length && (
            <span className="text-white/60">
              A árvore será criada junto com o primeiro ciclo.
            </span>
          )}
        </div>
      </Card>
      <Card>
        <FolderTree className="h-8 w-8 text-[#9a4a36]" />
        <h2 className="mt-4 font-serif text-xl font-bold text-[#401014]">
          Estrutura previsível
        </h2>
        <ol className="mt-4 space-y-3 text-sm text-[#684f51]">
          <li>1. Organização e ciclo anual</li>
          <li>2. Nível CERNE</li>
          <li>3. Processo e prática-chave</li>
          <li>4. Incubadora, programas, turmas, startups ou chamadas</li>
        </ol>
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          <strong>Integração:</strong> a estrutura lógica e os estados de
          sincronização já estão prontos. A criação física dependerá da conexão
          Google Drive e das credenciais da incubadora.
        </div>
      </Card>
    </div>
  );
}

function Review({
  data,
  activeCycleId,
  currentUserId,
  actions,
}: {
  data: CerneWorkspaceData;
  activeCycleId?: string;
  currentUserId: string;
  actions: Props["actions"];
}) {
  const myInvite = data.assignments.find(
    (a) =>
      a.cycle_id === activeCycleId &&
      a.reviewer_user_id === currentUserId &&
      a.status === "invited",
  );
  return (
    <div className="space-y-6">
      {myInvite && (
        <Card className="border-[#d99d57] bg-[#fff9ee]">
          <h2 className="font-serif text-xl font-bold text-[#401014]">
            Termo de confidencialidade
          </h2>
          <p className="mt-2 text-sm text-[#684f51]">
            Para acessar e emitir pareceres sobre as evidências, confirme o
            compromisso de sigilo e uso exclusivo para avaliação CERNE.
          </p>
          <form action={actions.acceptConfidentiality} className="mt-4">
            <input type="hidden" name="assignmentId" value={myInvite.id} />
            <button className={button}>Aceitar e acessar a banca</button>
          </form>
        </Card>
      )}
      {data.canManage && (
        <Card>
          <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
            Preparação da banca
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
            Convidar avaliador
          </h2>
          <form
            action={actions.assignReviewer}
            className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input type="hidden" name="cycleId" value={activeCycleId} />
            <select name="reviewerUserId" className={field} required>
              <option value="">Selecione uma pessoa</option>
              {data.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.email}
                </option>
              ))}
            </select>
            <select name="practiceCode" className={field}>
              <option value="">Todas as práticas</option>
              {data.practices.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
            <button className={button}>Convidar</button>
          </form>
        </Card>
      )}
      <Card>
        <p className="text-xs font-bold tracking-[.16em] text-[#9a4a36] uppercase">
          Mesa de avaliação
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-[#401014]">
          Evidências submetidas
        </h2>
        <div className="mt-5 space-y-4">
          {data.evidences
            .filter(
              (e) => e.cycle_id === activeCycleId && e.status === "submitted",
            )
            .map((evidence) => (
              <div
                key={evidence.id}
                className="rounded-xl border border-[#751118]/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#9a4a36]">
                      {evidence.practice_code}
                    </span>
                    <h3 className="font-semibold text-[#401014]">
                      {evidence.title}
                    </h3>
                  </div>
                  {evidence.external_url && (
                    <a
                      href={evidence.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#8f111a]"
                    >
                      Abrir fonte ↗
                    </a>
                  )}
                </div>
                {data.canReview && (
                  <form
                    action={actions.reviewEvidence}
                    className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_auto]"
                  >
                    <input
                      type="hidden"
                      name="evidenceId"
                      value={evidence.id}
                    />
                    <select name="result" className={field}>
                      <option value="valid">Válida</option>
                      <option value="partial">Parcial</option>
                      <option value="invalid">Inválida</option>
                    </select>
                    <input
                      name="notes"
                      className={field}
                      placeholder="Fundamentação do parecer"
                      required
                    />
                    <button className={button}>Emitir parecer</button>
                  </form>
                )}
              </div>
            ))}
          {!data.evidences.some(
            (e) => e.cycle_id === activeCycleId && e.status === "submitted",
          ) && <Empty>Não há evidências aguardando parecer.</Empty>}
        </div>
      </Card>
    </div>
  );
}
