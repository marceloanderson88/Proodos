import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Edit3,
  Flag,
  Gauge,
  Layers3,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  addProgramMemberAction,
  removeProgramMemberAction,
  updateProgramAction,
} from "@/app/(private)/o/[organizationSlug]/m6-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { ProgramTypeNameField } from "@/components/m6/program-type-name-field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";

type Program = {
  id: string;
  name: string;
  code: string;
  typeName: string;
  status: string;
  description: string | null;
  objectives: string | null;
  targetAudience: string | null;
  deliveryMode: "in_person" | "remote" | "hybrid" | null;
  durationWeeks: number | null;
  suggestedCapacity: number | null;
  startsOn: string | null;
  endsOn: string | null;
  logoUrl: string | null;
};
type Cohort = {
  id: string;
  name: string;
  code: string;
  status: string;
  launchesOn: string;
  startsOn: string;
  endsOn: string | null;
  capacity: number | null;
  startupCount: number;
};
type Person = { userId: string; displayName: string; email: string };
type Member = {
  id: string;
  userId: string;
  role: "coordinator" | "staff" | "viewer";
};

const roleLabels = {
  coordinator: "Coordenação",
  staff: "Equipe",
  viewer: "Leitura",
} as const;
const modeLabels = {
  in_person: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
} as const;

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : "A definir";
}

export function ProgramDetail({
  organizationSlug,
  incubatorSlug,
  program,
  cohorts,
  people,
  members,
  diagnosticTemplateCount,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  program: Program;
  cohorts: Cohort[];
  people: Person[];
  members: Member[];
  diagnosticTemplateCount: number;
  success?: string;
  error?: string;
}) {
  const readiness = [
    program.description,
    program.objectives,
    program.targetAudience,
    program.deliveryMode,
    members.length > 0,
  ].filter(Boolean).length;
  const basePath = `/o/${organizationSlug}/i/${incubatorSlug}`;
  return (
    <div className="page-enter space-y-6">
      <Link
        href={`${basePath}/programas`}
        className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--wine-800)] hover:underline"
      >
        <ArrowLeft className="size-4" /> Programas e turmas
      </Link>
      <header className="surface-card overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="relative grid size-24 place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
            {program.logoUrl ? (
              <Image
                src={program.logoUrl}
                alt={`Logo de ${program.name}`}
                fill
                unoptimized
                className="object-contain p-3"
              />
            ) : (
              <Layers3 className="size-9 text-[var(--wine-700)]" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                tone={program.status === "active" ? "success" : "warning"}
              >
                {program.status === "active" ? "Publicado" : "Rascunho"}
              </StatusBadge>
              <span className="text-xs font-bold text-[var(--text-muted)]">
                {program.typeName} · {program.code}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black text-[var(--wine-950)] sm:text-4xl">
              {program.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              {program.description ??
                "Complete a descrição para orientar equipe e participantes."}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-subtle)] p-4 text-center">
            <p className="text-3xl font-black text-[var(--wine-950)]">
              {readiness}/5
            </p>
            <p className="text-[0.65rem] font-extrabold text-[var(--text-muted)] uppercase">
              Preparação
            </p>
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2"
          aria-label="Seções do programa"
        >
          {[
            ["overview", "Visão geral", Gauge],
            ["cohorts", "Turmas", CalendarDays],
            ["team", "Equipe", UsersRound],
            ["development", "Desenvolvimento", BookOpen],
            ["settings", "Configurações", Settings2],
          ].map(([id, label, Icon]) => {
            const NavIcon = Icon as typeof Gauge;
            return (
              <a
                key={String(id)}
                href={`#${id}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-[var(--text)] hover:bg-white"
              >
                <NavIcon className="size-4 text-[var(--wine-700)]" />
                {String(label)}
              </a>
            );
          })}
        </nav>
      </header>
      <FeedbackBanner success={success} error={error} />

      <section id="overview" className="grid scroll-mt-24 gap-5 lg:grid-cols-2">
        <article className="surface-card p-5 sm:p-6">
          <p className="eyebrow">Propósito</p>
          <h2 className="operational-heading mt-1 text-xl">Objetivos</h2>
          <p className="mt-4 text-sm leading-7 whitespace-pre-line text-[var(--text-muted)]">
            {program.objectives ?? "Objetivos ainda não definidos."}
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <p className="eyebrow">Participantes</p>
          <h2 className="operational-heading mt-1 text-xl">Público-alvo</h2>
          <p className="mt-4 text-sm leading-7 whitespace-pre-line text-[var(--text-muted)]">
            {program.targetAudience ?? "Público-alvo ainda não definido."}
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              [
                program.deliveryMode
                  ? modeLabels[program.deliveryMode]
                  : "A definir",
                "Modalidade",
              ],
              [
                program.durationWeeks
                  ? `${program.durationWeeks} semanas`
                  : "A definir",
                "Duração estimada",
              ],
              [program.suggestedCapacity ?? "A definir", "Capacidade sugerida"],
              [
                program.startsOn
                  ? `${formatDate(program.startsOn)} — ${formatDate(program.endsOn)}`
                  : "Sem limite",
                "Vigência",
              ],
            ].map(([value, label]) => (
              <div
                key={String(label)}
                className="rounded-2xl bg-[var(--surface-subtle)] p-4"
              >
                <p className="text-sm font-extrabold text-[var(--text-strong)]">
                  {value}
                </p>
                <p className="mt-1 text-[0.65rem] text-[var(--text-muted)] uppercase">
                  {String(label)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="cohorts" className="surface-card scroll-mt-24 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Execuções</p>
            <h2 className="operational-heading mt-1 text-xl">
              Turmas do programa
            </h2>
          </div>
          <StatusBadge>{cohorts.length}</StatusBadge>
        </div>
        {cohorts.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma turma"
              description="Crie a primeira turma na página Programas e Turmas para iniciar uma execução."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {cohorts.map((cohort) => (
              <article
                key={cohort.id}
                className="rounded-2xl border border-[var(--border)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-[var(--text-strong)]">
                      {cohort.name}
                    </p>
                    <p className="mt-1 text-[0.65rem] text-[var(--text-muted)]">
                      {cohort.code}
                    </p>
                  </div>
                  <StatusBadge
                    tone={cohort.status === "active" ? "success" : "neutral"}
                  >
                    {cohort.status}
                  </StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)]">
                  <span>
                    Ciclo: {formatDate(cohort.startsOn)} —{" "}
                    {formatDate(cohort.endsOn)}
                  </span>
                  <span>
                    {cohort.startupCount} startup(s) · capacidade{" "}
                    {cohort.capacity ?? "livre"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="team"
        className="grid scroll-mt-24 gap-5 xl:grid-cols-[0.72fr_1.28fr]"
      >
        <div className="surface-card p-5 sm:p-6">
          <p className="eyebrow">Governança</p>
          <h2 className="operational-heading mt-1 text-xl">
            Adicionar à equipe
          </h2>
          <form
            action={addProgramMemberAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-5 space-y-4"
          >
            <input type="hidden" name="programId" value={program.id} />
            <FormField label="Pessoa ativa" htmlFor="program-person" required>
              <select
                id="program-person"
                className={controlClassName}
                name="userId"
                required
              >
                <option value="">Selecione</option>
                {people.map((person) => (
                  <option key={person.userId} value={person.userId}>
                    {person.displayName} · {person.email}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Papel no programa"
              htmlFor="program-person-role"
              required
            >
              <select
                id="program-person-role"
                className={controlClassName}
                name="role"
                defaultValue="staff"
              >
                <option value="coordinator">Coordenação</option>
                <option value="staff">Equipe</option>
                <option value="viewer">Leitura</option>
              </select>
            </FormField>
            <Button type="submit">Adicionar à equipe</Button>
          </form>
        </div>
        <div className="surface-card p-5 sm:p-6">
          <p className="eyebrow">Equipe atual</p>
          <h2 className="operational-heading mt-1 text-xl">
            Responsáveis pelo programa
          </h2>
          {members.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={UsersRound}
                title="Equipe não definida"
                description="Adicione ao menos uma pessoa de coordenação antes de publicar o programa."
              />
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-[var(--border)]">
              {members.map((member) => {
                const person = people.find(
                  (item) => item.userId === member.userId,
                );
                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[var(--text-strong)]">
                        {person?.displayName ?? "Pessoa indisponível"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {person?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={
                          member.role === "coordinator" ? "info" : "neutral"
                        }
                      >
                        {roleLabels[member.role]}
                      </StatusBadge>
                      <form
                        action={removeProgramMemberAction.bind(
                          null,
                          organizationSlug,
                          incubatorSlug,
                        )}
                      >
                        <input
                          type="hidden"
                          name="programId"
                          value={program.id}
                        />
                        <input
                          type="hidden"
                          name="programMemberId"
                          value={member.id}
                        />
                        <ConfirmSubmitButton
                          message={`Remover ${person?.displayName ?? "esta pessoa"} da equipe do programa?`}
                        >
                          <Trash2 className="size-3.5" />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section
        id="development"
        className="surface-card scroll-mt-24 p-5 sm:p-6"
      >
        <p className="eyebrow">Modelo de desenvolvimento</p>
        <h2 className="operational-heading mt-1 text-xl">
          Recursos associados à execução
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            [
              ClipboardCheck,
              "Diagnósticos",
              diagnosticTemplateCount
                ? `${diagnosticTemplateCount} modelo(s) disponível(is)`
                : "Nenhum modelo publicado",
              `${basePath}/diagnosticos`,
            ],
            [
              BookOpen,
              "Trilhas e conteúdos",
              "Catálogo será associado ao programa sem CERNE obrigatório",
              `${basePath}/conteudos`,
            ],
            [
              Flag,
              "Planos e indicadores",
              "Aplicados às startups de cada turma",
              `${basePath}/planos-de-acao`,
            ],
            [
              ShieldCheck,
              "Evidência CERNE",
              "Registrar este programa, sua execução ou resultados no dossiê",
              `${basePath}/cerne?view=evidences&sourceType=program&sourceId=${program.id}&sourceName=${encodeURIComponent(program.name)}&practice=1.3.1`,
            ],
          ].map(([Icon, title, description, href]) => {
            const CardIcon = Icon as typeof ClipboardCheck;
            return (
              <Link
                key={String(title)}
                href={String(href)}
                className="rounded-2xl border border-[var(--border)] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardIcon className="size-5 text-[var(--wine-700)]" />
                <p className="operational-heading mt-3 text-sm">
                  {String(title)}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  {String(description)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="settings" className="surface-card scroll-mt-24 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Edit3 className="size-5 text-[var(--wine-700)]" />
          <div>
            <p className="eyebrow">Configurações</p>
            <h2 className="operational-heading mt-1 text-xl">
              Editar programa
            </h2>
          </div>
        </div>
        <form
          action={updateProgramAction.bind(
            null,
            organizationSlug,
            incubatorSlug,
          )}
          className="mt-5 space-y-5 border-t border-[var(--border)] pt-5"
        >
          <input type="hidden" name="programId" value={program.id} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Nome" htmlFor="edit-program-name" required>
              <input
                id="edit-program-name"
                className={controlClassName}
                name="name"
                defaultValue={program.name}
                required
              />
            </FormField>
            <ProgramTypeNameField
              currentName={program.typeName}
              idSuffix={program.id}
            />
            <FormField
              className="lg:col-span-2"
              label="Descrição"
              htmlFor="edit-program-description"
            >
              <textarea
                id="edit-program-description"
                className={`${controlClassName} min-h-24`}
                name="description"
                defaultValue={program.description ?? ""}
              />
            </FormField>
            <FormField label="Objetivos" htmlFor="edit-program-objectives">
              <textarea
                id="edit-program-objectives"
                className={`${controlClassName} min-h-28`}
                name="objectives"
                defaultValue={program.objectives ?? ""}
              />
            </FormField>
            <FormField label="Público-alvo" htmlFor="edit-program-audience">
              <textarea
                id="edit-program-audience"
                className={`${controlClassName} min-h-28`}
                name="targetAudience"
                defaultValue={program.targetAudience ?? ""}
              />
            </FormField>
            <FormField label="Modalidade" htmlFor="edit-program-mode">
              <select
                id="edit-program-mode"
                className={controlClassName}
                name="deliveryMode"
                defaultValue={program.deliveryMode ?? "hybrid"}
              >
                <option value="in_person">Presencial</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </FormField>
            <FormField
              label="Duração em semanas"
              htmlFor="edit-program-duration"
            >
              <input
                id="edit-program-duration"
                type="number"
                min={1}
                className={controlClassName}
                name="durationWeeks"
                defaultValue={program.durationWeeks ?? ""}
              />
            </FormField>
            <FormField
              label="Capacidade sugerida"
              htmlFor="edit-program-capacity"
            >
              <input
                id="edit-program-capacity"
                type="number"
                min={1}
                className={controlClassName}
                name="suggestedCapacity"
                defaultValue={program.suggestedCapacity ?? ""}
              />
            </FormField>
            <FormField label="Início da vigência" htmlFor="edit-program-start">
              <input
                id="edit-program-start"
                type="date"
                className={controlClassName}
                name="startsOn"
                defaultValue={program.startsOn ?? ""}
              />
            </FormField>
            <FormField label="Fim da vigência" htmlFor="edit-program-end">
              <input
                id="edit-program-end"
                type="date"
                className={controlClassName}
                name="endsOn"
                defaultValue={program.endsOn ?? ""}
              />
            </FormField>
            <FileUpload
              className="lg:col-span-2"
              name="logo"
              removeName="removeLogo"
              label="Identidade visual"
              hint="PNG, JPG ou WebP, até 2 MB."
              currentImageUrl={program.logoUrl}
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--surface-subtle)] p-4 text-sm font-bold">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={program.status === "active"}
              className="size-4 accent-[var(--wine-800)]"
            />{" "}
            Programa publicado
          </label>
          <Button type="submit">Salvar alterações</Button>
        </form>
      </section>
    </div>
  );
}
