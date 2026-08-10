import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Send,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { publicSelectionCallFromJson } from "@/lib/selection/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  respondPublicSelectionConvocationAction,
  submitPublicSelectionAppealAction,
  submitPublicSelectionApplicationAction,
} from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-12 w-full rounded-xl border border-[#751118]/12 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#921a20] focus:ring-4 focus:ring-[#751118]/8";

export default async function PublicSelectionCallPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createServerSupabaseClient();
  const [callResult, openResult] = await Promise.all([
    supabase.rpc("get_public_selection_call", { call_slug: slug }),
    supabase.rpc("list_open_selection_call_slugs"),
  ]);
  if (callResult.error || openResult.error || !callResult.data) notFound();
  const call = publicSelectionCallFromJson(callResult.data);
  const open = (openResult.data ?? []).includes(call.slug);
  const action = submitPublicSelectionApplicationAction.bind(null, call);
  const appealAction = submitPublicSelectionAppealAction.bind(null, call.slug);
  const convocationAction = respondPublicSelectionConvocationAction.bind(
    null,
    call.slug,
  );
  return (
    <main className="min-h-screen bg-[#fbf5ef]">
      <div className="wine-panel h-2" />
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <header className="flex items-center justify-between">
          <BrandMark />
          <Link
            href="/chamadas"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#751118]"
          >
            <ArrowLeft className="size-4" /> Todas as chamadas
          </Link>
        </header>
        <section className="relative mt-10 overflow-hidden rounded-[2rem] bg-[#3f090d] px-6 py-10 text-white shadow-[0_28px_80px_rgba(63,9,13,.22)] sm:px-10">
          <div className="dot-field absolute inset-y-0 right-0 w-72 opacity-15" />
          <div className="relative max-w-4xl">
            <p className="text-xs font-black tracking-[.16em] text-[#f4c47a] uppercase">
              {call.code} · {call.incubatorName}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-6xl">
              {call.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/70">
              {call.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold">
              <span className="rounded-full bg-white/10 px-4 py-2">
                {call.programName} · {call.cohortName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f4c47a]/15 px-4 py-2 text-[#f4c47a]">
                <CalendarDays className="size-4" /> Até{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(call.closeAt))}
              </span>
            </div>
          </div>
        </section>
        {query.success && (
          <div
            role="status"
            className="mt-6 flex gap-3 rounded-2xl border border-[#3d8b51]/20 bg-[#edf7ee] p-4 text-sm font-bold text-[#27643a]"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            {query.success}
          </div>
        )}
        {query.error && (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-2xl border border-[#ad2b2f]/20 bg-[#fceaea] p-4 text-sm font-bold text-[#751118]"
          >
            <TriangleAlert className="size-5 shrink-0" />
            {query.error}
          </div>
        )}
        {call.result.length > 0 && (
          <>
            <section className="surface-card mt-8 p-6 sm:p-8">
              <p className="eyebrow">Resultado publicado</p>
              <h2 className="mt-2 text-2xl font-black text-[#3f090d]">
                Classificação
              </h2>
              <div className="mt-5 divide-y divide-[#751118]/8">
                {call.result.map((row) => (
                  <div
                    key={`${row.position ?? "resultado"}-${row.startupName ?? row.outcome}`}
                    className={`grid ${row.position ? "grid-cols-[3rem_1fr_auto]" : "grid-cols-[1fr_auto]"} items-center gap-3 py-4`}
                  >
                    {row.position ? (
                      <span className="text-xl font-black text-[#751118]">
                        #{row.position}
                      </span>
                    ) : null}
                    <span>
                      <strong className="block text-sm text-[#3f090d]">
                        {row.startupName ?? "Proposta classificada"}
                      </strong>
                      <span className="text-xs text-[#8b7c76]">
                        {[row.city, row.state].filter(Boolean).join("/")}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#fff1d8] px-3 py-1 text-xs font-black text-[#87500e]">
                      {row.outcome === "selected" ? "Selecionada" : "Suplente"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <form
                action={appealAction}
                className="surface-card space-y-3 p-6"
              >
                <p className="eyebrow">Contraditório</p>
                <h2 className="text-xl font-black text-[#3f090d]">
                  Protocolar recurso
                </h2>
                <input
                  className={inputClass}
                  name="protocol"
                  required
                  placeholder="Protocolo da inscrição"
                />
                <input
                  className={inputClass}
                  name="email"
                  type="email"
                  required
                  placeholder="E-mail da inscrição"
                />
                <textarea
                  className={`${inputClass} min-h-28`}
                  name="grounds"
                  required
                  minLength={30}
                  placeholder="Fundamentação do recurso"
                />
                <Button type="submit">Enviar recurso</Button>
              </form>
              <form
                action={convocationAction}
                className="surface-card space-y-3 p-6"
              >
                <p className="eyebrow">Ingresso</p>
                <h2 className="text-xl font-black text-[#3f090d]">
                  Responder convocação
                </h2>
                <input
                  className={inputClass}
                  name="protocol"
                  required
                  placeholder="Protocolo da inscrição"
                />
                <input
                  className={inputClass}
                  name="email"
                  type="email"
                  required
                  placeholder="E-mail da inscrição"
                />
                <div className="flex gap-2">
                  <Button type="submit" name="response" value="accept">
                    Aceitar vaga
                  </Button>
                  <Button
                    type="submit"
                    name="response"
                    value="decline"
                    variant="danger"
                  >
                    Recusar
                  </Button>
                </div>
              </form>
            </section>
          </>
        )}
        <section className="mt-8 grid gap-8 pb-16 lg:grid-cols-[.72fr_1.28fr]">
          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <article className="surface-card p-6">
              <Clock3 className="size-5 text-[#d97918]" />
              <h2 className="mt-4 text-xl font-black text-[#3f090d]">
                Antes de enviar
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#746661]">
                <li>Revise os dados do responsável.</li>
                <li>Responda todos os campos obrigatórios.</li>
                <li>Guarde o protocolo exibido após o envio.</li>
                <li>Cada e-mail pode enviar uma proposta nesta chamada.</li>
              </ul>
            </article>
          </aside>
          <section className="surface-card p-6 sm:p-8">
            <p className="eyebrow">Formulário oficial</p>
            <h2 className="mt-2 text-2xl font-black text-[#3f090d]">
              Inscrição da proposta
            </h2>
            {!open ? (
              <div className="mt-6 rounded-2xl bg-[#eee8e5] p-5 text-sm font-bold text-[#655854]">
                O formulário não está aberto neste momento. A página continua
                disponível para consulta.
              </div>
            ) : (
              <form action={action} className="mt-7 space-y-7">
                <input
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  name="website"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["applicantName", "Nome do responsável", "text", true],
                    ["applicantEmail", "E-mail", "email", true],
                    ["applicantPhone", "Telefone", "text", false],
                    ["startupName", "Nome da proposta/startup", "text", true],
                    ["legalName", "Razão social, se houver", "text", false],
                    ["taxId", "CPF/CNPJ", "text", false],
                    ["city", "Cidade", "text", false],
                    ["state", "Estado", "text", false],
                    ["sector", "Setor de atuação", "text", false],
                  ].map(([name, label, type, required]) => (
                    <label key={String(name)} className="space-y-2">
                      <span className="text-xs font-black text-[#594844]">
                        {String(label)}
                        {required ? " *" : ""}
                      </span>
                      <input
                        className={inputClass}
                        name={String(name)}
                        type={String(type)}
                        required={Boolean(required)}
                      />
                    </label>
                  ))}
                  <label className="space-y-2">
                    <span className="text-xs font-black text-[#594844]">
                      Estágio *
                    </span>
                    <select className={inputClass} name="stage" required>
                      <option value="idea">Ideia</option>
                      <option value="validation">Validação</option>
                      <option value="operation">Operação</option>
                      <option value="traction">Tração</option>
                      <option value="scale">Escala</option>
                    </select>
                  </label>
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-black text-[#594844]">
                      Resumo executivo
                    </span>
                    <textarea
                      className={`${inputClass} min-h-28`}
                      name="summary"
                    />
                  </label>
                </div>
                <div className="h-px bg-[#751118]/10" />
                {call.questions.map((question, index) => (
                  <label key={question.id} className="block space-y-2">
                    <span className="text-sm font-black text-[#3f090d]">
                      <span className="mr-2 text-[#d97918]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {question.label}
                      {question.required ? " *" : ""}
                    </span>
                    {question.helpText && (
                      <span className="block text-xs text-[#8b7c76]">
                        {question.helpText}
                      </span>
                    )}
                    {question.kind === "long_text" ? (
                      <textarea
                        className={`${inputClass} min-h-32`}
                        name={`answer_${question.code}`}
                        required={question.required}
                      />
                    ) : question.kind === "boolean" ? (
                      <select
                        className={inputClass}
                        name={`answer_${question.code}`}
                        required={question.required}
                      >
                        <option value="">Selecione</option>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    ) : (
                      <input
                        className={inputClass}
                        name={`answer_${question.code}`}
                        required={question.required}
                        type={
                          question.kind === "number"
                            ? "number"
                            : question.kind === "url"
                              ? "url"
                              : question.kind === "date"
                                ? "date"
                                : "text"
                        }
                      />
                    )}
                  </label>
                ))}
                <Button type="submit" className="w-full sm:w-auto">
                  <Send className="size-4" /> Enviar inscrição
                </Button>
              </form>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
