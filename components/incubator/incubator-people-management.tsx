import {
  Building2,
  Check,
  Clock3,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import {
  assignIncubatorPersonRoleAction,
  inviteIncubatorPersonAction,
  manageInvitationAction,
  removeIncubatorPersonRoleAction,
  updateIncubatorOperationsAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/people-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { controlClassName, FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { INVITATION_VALIDITY_OPTIONS } from "@/lib/invitations/validity";

type Person = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
};
type Role = { id: string; name: string; description: string };
type Assignment = { id: string; membershipId: string; roleId: string };
type Invitation = {
  id: string;
  invited_name: string | null;
  email: string;
  role_id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
};
type SettingsObject = Record<string, unknown>;

export function IncubatorPeopleManagement({
  view,
  organizationSlug,
  incubatorSlug,
  incubatorName,
  incubatorSettings,
  people,
  roles,
  assignments,
  invitations,
  success,
  error,
}: {
  view: "operacao" | "equipe" | "convites";
  organizationSlug: string;
  incubatorSlug: string;
  incubatorName: string;
  incubatorSettings: {
    name: string;
    timezone: string;
    locale: string;
    settings: unknown;
    kind:
      | "incubator"
      | "accelerator"
      | "innovation_hub"
      | "innovation_center"
      | "other";
    customKind: string | null;
    legalName: string | null;
    description: string | null;
    logoUrl: string | null;
    contactEmail: string | null;
    phone: string | null;
    website: string | null;
    city: string | null;
    state: string | null;
    countryCode: string;
    responsibleName: string | null;
  };
  people: Person[];
  roles: Role[];
  assignments: Assignment[];
  invitations: Invitation[];
  success?: string;
  error?: string;
}) {
  const settings =
    incubatorSettings.settings &&
    typeof incubatorSettings.settings === "object" &&
    !Array.isArray(incubatorSettings.settings)
      ? (incubatorSettings.settings as SettingsObject)
      : {};
  const resources =
    settings.resources && typeof settings.resources === "object"
      ? (settings.resources as SettingsObject)
      : {};
  const assignedPeople = people.filter((person) =>
    assignments.some((item) => item.membershipId === person.membershipId),
  );
  const profileReady = Boolean(
    incubatorSettings.description &&
    incubatorSettings.contactEmail &&
    incubatorSettings.city &&
    incubatorSettings.state &&
    incubatorSettings.responsibleName,
  );
  const teamReady = assignedPeople.length > 0;
  const pageCopy = {
    operacao: {
      title: "Configuração da operação",
      description: `Mantenha a identidade institucional e os módulos habilitados para ${incubatorName}.`,
    },
    equipe: {
      title: "Equipe e papéis",
      description:
        "Consulte as pessoas ativas e conceda somente os papéis necessários para cada função.",
    },
    convites: {
      title: "Convites de acesso",
      description:
        "Convide novas pessoas e acompanhe acessos que ainda aguardam aceite.",
    },
  }[view];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Administração da incubadora"
        title={pageCopy.title}
        description={pageCopy.description}
        icon={ShieldCheck}
      />
      <FeedbackBanner success={success} error={error} />

      <section
        className={`${view === "operacao" ? "grid" : "hidden"} surface-card gap-4 p-5 sm:grid-cols-3 sm:p-6`}
        aria-label="Progresso de implantação"
      >
        {[
          [
            profileReady,
            "Perfil institucional",
            "Identidade, contato e território",
          ],
          [teamReady, "Primeiro gestor", "Pessoa ativa com papel local"],
          [
            invitations.length === 0,
            "Convites organizados",
            invitations.length
              ? `${invitations.length} pendente(s)`
              : "Nenhuma pendência",
          ],
        ].map(([done, title, description]) => (
          <div
            key={String(title)}
            className="flex gap-3 rounded-2xl bg-[var(--surface-subtle)] p-4"
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${done ? "bg-[#e8f5e9] text-[#28713c]" : "bg-[#fff1d8] text-[#87500e]"}`}
            >
              {done ? (
                <Check className="size-4" />
              ) : (
                <Clock3 className="size-4" />
              )}
            </span>
            <div>
              <p className="text-sm font-extrabold text-[var(--text-strong)]">
                {String(title)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {String(description)}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section
        className={`${view === "operacao" ? "block" : "hidden"} surface-card p-5 sm:p-7`}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="eyebrow">Perfil institucional</p>
            <h2 className="operational-heading mt-1 text-xl">
              Configurações da operação
            </h2>
          </div>
        </div>
        <form
          action={updateIncubatorOperationsAction.bind(
            null,
            organizationSlug,
            incubatorSlug,
          )}
          className="mt-6 space-y-6 border-t border-[var(--border)] pt-6"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Nome" htmlFor="settings-name" required>
              <input
                id="settings-name"
                className={controlClassName}
                name="name"
                defaultValue={incubatorSettings.name}
                required
              />
            </FormField>
            <FormField
              label="Natureza da operação"
              htmlFor="settings-kind"
              required
            >
              <select
                id="settings-kind"
                className={controlClassName}
                name="kind"
                defaultValue={incubatorSettings.kind}
              >
                <option value="incubator">Incubadora</option>
                <option value="accelerator">Aceleradora</option>
                <option value="innovation_hub">Hub de inovação</option>
                <option value="innovation_center">Núcleo de inovação</option>
                <option value="other">Outro</option>
              </select>
            </FormField>
            <FormField
              label="Outro tipo"
              htmlFor="settings-custom-kind"
              hint="Preencha somente quando a natureza selecionada for Outro."
            >
              <input
                id="settings-custom-kind"
                className={controlClassName}
                name="customKind"
                defaultValue={incubatorSettings.customKind ?? ""}
              />
            </FormField>
            <FormField
              label="Instituição mantenedora"
              htmlFor="settings-legal-name"
            >
              <input
                id="settings-legal-name"
                className={controlClassName}
                name="legalName"
                defaultValue={incubatorSettings.legalName ?? ""}
              />
            </FormField>
            <FormField
              className="lg:col-span-2"
              label="Descrição"
              htmlFor="settings-description"
              required
            >
              <textarea
                id="settings-description"
                className={`${controlClassName} min-h-28 resize-y`}
                name="description"
                defaultValue={incubatorSettings.description ?? ""}
                required
              />
            </FormField>
            <FileUpload
              className="lg:col-span-2"
              name="logo"
              removeName="removeLogo"
              label="Logo da incubadora"
              hint="PNG, JPG ou WebP, até 2 MB."
              currentImageUrl={incubatorSettings.logoUrl}
            />
          </div>

          <div className="grid gap-4 border-t border-[var(--border)] pt-6 md:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="E-mail institucional"
              htmlFor="settings-email"
              required
            >
              <input
                id="settings-email"
                type="email"
                className={controlClassName}
                name="contactEmail"
                defaultValue={incubatorSettings.contactEmail ?? ""}
                required
              />
            </FormField>
            <FormField label="Telefone" htmlFor="settings-phone">
              <input
                id="settings-phone"
                className={controlClassName}
                name="phone"
                defaultValue={incubatorSettings.phone ?? ""}
              />
            </FormField>
            <FormField label="Site" htmlFor="settings-website">
              <input
                id="settings-website"
                type="url"
                className={controlClassName}
                name="website"
                defaultValue={incubatorSettings.website ?? ""}
              />
            </FormField>
            <FormField label="Cidade" htmlFor="settings-city" required>
              <input
                id="settings-city"
                className={controlClassName}
                name="city"
                defaultValue={incubatorSettings.city ?? ""}
                required
              />
            </FormField>
            <FormField label="Estado" htmlFor="settings-state" required>
              <input
                id="settings-state"
                className={controlClassName}
                name="state"
                defaultValue={incubatorSettings.state ?? ""}
                required
              />
            </FormField>
            <FormField
              label="Responsável pela implantação"
              htmlFor="settings-responsible"
              required
            >
              <input
                id="settings-responsible"
                className={controlClassName}
                name="responsibleName"
                defaultValue={incubatorSettings.responsibleName ?? ""}
                required
              />
            </FormField>
            <FormField
              label="Fuso horário"
              htmlFor="settings-timezone"
              required
            >
              <select
                id="settings-timezone"
                className={controlClassName}
                name="timezone"
                defaultValue={incubatorSettings.timezone}
              >
                <option value="America/Sao_Paulo">Brasília (UTC−03)</option>
                <option value="America/Manaus">Manaus (UTC−04)</option>
                <option value="America/Rio_Branco">Rio Branco (UTC−05)</option>
              </select>
            </FormField>
          </div>
          <input type="hidden" name="locale" value={incubatorSettings.locale} />
          <input
            type="hidden"
            name="countryCode"
            value={incubatorSettings.countryCode}
          />

          <fieldset className="border-t border-[var(--border)] pt-6">
            <legend className="operational-heading text-sm text-[var(--text-strong)]">
              Módulos habilitados
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["diagnosticsEnabled", "Diagnósticos", resources.diagnostics],
                ["actionPlansEnabled", "Planos de ação", resources.actionPlans],
                ["mentoringEnabled", "Mentorias", resources.mentoring],
                [
                  "learningTrailsEnabled",
                  "Conteúdos e trilhas",
                  resources.learningTrails,
                ],
              ].map(([name, label, checked]) => (
                <label
                  key={String(name)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-3 text-sm font-bold text-[var(--text)]"
                >
                  <input
                    type="checkbox"
                    name={String(name)}
                    defaultChecked={checked !== false}
                    className="size-4 accent-[var(--wine-800)]"
                  />
                  {String(label)}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit">Salvar perfil e módulos</Button>
        </form>
      </section>

      <section
        className={`${view === "equipe" || view === "convites" ? "grid" : "hidden"} gap-5 xl:grid-cols-[0.8fr_1.2fr]`}
      >
        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
              <UserRoundPlus className="size-5" />
            </span>
            <div>
              <p className="eyebrow">
                {view === "convites" ? "Novo acesso" : "Permissões"}
              </p>
              <h2 className="operational-heading mt-1 text-xl">
                {view === "convites" ? "Convidar pessoa" : "Atribuir papel"}
              </h2>
            </div>
          </div>
          <form
            action={inviteIncubatorPersonAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className={`${view === "convites" ? "mt-5 space-y-4" : "hidden"} border-t border-[var(--border)] pt-5`}
          >
            <FormField label="Nome" htmlFor="invite-name" required>
              <input
                id="invite-name"
                className={controlClassName}
                name="invitedName"
                required
              />
            </FormField>
            <FormField
              label="E-mail"
              htmlFor="invite-email"
              required
              hint="A pessoa receberá um link seguro para criar a conta ou entrar."
            >
              <input
                id="invite-email"
                type="email"
                className={controlClassName}
                name="email"
                required
              />
            </FormField>
            <FormField label="Papel inicial" htmlFor="invite-role" required>
              <select
                id="invite-role"
                className={controlClassName}
                name="roleId"
                required
              >
                <option value="">Selecione</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Validade" htmlFor="invite-expiry">
              <select
                id="invite-expiry"
                className={controlClassName}
                name="validity"
                defaultValue="one_month"
              >
                {INVITATION_VALIDITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <Button type="submit">
              <Mail className="size-4" /> Enviar convite
            </Button>
          </form>

          <div
            className={`${view === "equipe" ? "mt-7 block" : "hidden"} border-t border-[var(--border)] pt-5`}
          >
            <p className="operational-heading text-sm">
              Adicionar papel a pessoa existente
            </p>
            <form
              action={assignIncubatorPersonRoleAction.bind(
                null,
                organizationSlug,
                incubatorSlug,
              )}
              className="mt-3 space-y-3"
            >
              <select
                aria-label="Pessoa ativa"
                className={controlClassName}
                name="membershipId"
                required
              >
                <option value="">Selecione a pessoa</option>
                {people.map((person) => (
                  <option key={person.membershipId} value={person.membershipId}>
                    {person.displayName} · {person.email}
                  </option>
                ))}
              </select>
              <select
                aria-label="Novo papel"
                className={controlClassName}
                name="roleId"
                required
              >
                <option value="">Selecione o papel</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">
                Atribuir outro papel
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <section
            className={`${view === "equipe" ? "block" : "hidden"} surface-card p-5 sm:p-6`}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
                <UsersRound className="size-5" />
              </span>
              <div>
                <p className="eyebrow">Equipe ativa</p>
                <h2 className="operational-heading mt-1 text-xl">
                  Pessoas e papéis
                </h2>
              </div>
            </div>
            {assignedPeople.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  icon={UsersRound}
                  title="Nenhuma pessoa com papel local"
                  description="Convide o primeiro gestor para concluir a implantação da incubadora."
                />
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--border)]">
                {assignedPeople.map((person) => {
                  const personAssignments = assignments.filter(
                    (item) => item.membershipId === person.membershipId,
                  );
                  return (
                    <li
                      key={person.membershipId}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-[var(--text-strong)]">
                            {person.displayName}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {person.email}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {personAssignments.map((assignment) => {
                            const role = roles.find(
                              (item) => item.id === assignment.roleId,
                            );
                            return (
                              <form
                                key={assignment.id}
                                action={removeIncubatorPersonRoleAction.bind(
                                  null,
                                  organizationSlug,
                                  incubatorSlug,
                                )}
                              >
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <button
                                  className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-[0.68rem] font-extrabold text-[var(--wine-800)] hover:bg-[#fde7e8]"
                                  aria-label={`Remover papel ${role?.name ?? "atribuído"} de ${person.displayName}`}
                                >
                                  {role?.name ?? "Papel"}
                                  <Trash2 className="size-3 opacity-55 group-hover:opacity-100" />
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            className={`${view === "convites" ? "block" : "hidden"} surface-card p-5 sm:p-6`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Aguardando aceite</p>
                <h2 className="operational-heading mt-1 text-xl">
                  Convites pendentes
                </h2>
              </div>
              <StatusBadge tone={invitations.length ? "warning" : "success"}>
                {invitations.length}
              </StatusBadge>
            </div>
            {invitations.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-[var(--surface-subtle)] p-5 text-center text-sm text-[var(--text-muted)]">
                Não há convites pendentes.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {invitations.map((invitation) => {
                  const role = roles.find(
                    (item) => item.id === invitation.role_id,
                  );
                  return (
                    <li
                      key={invitation.id}
                      className="rounded-2xl border border-[var(--border)] bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-[var(--text-strong)]">
                            {invitation.invited_name ?? invitation.email}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {invitation.email}
                          </p>
                          <p className="mt-2 text-[0.68rem] font-bold text-[var(--wine-700)]">
                            {role?.name ?? "Papel indisponível"} ·{" "}
                            {invitation.expires_at
                              ? `expira em ${new Intl.DateTimeFormat("pt-BR").format(new Date(invitation.expires_at))}`
                              : "sem prazo"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <form
                            action={manageInvitationAction.bind(
                              null,
                              organizationSlug,
                              incubatorSlug,
                            )}
                          >
                            <input
                              type="hidden"
                              name="invitationId"
                              value={invitation.id}
                            />
                            <input type="hidden" name="action" value="resend" />
                            <Button
                              type="submit"
                              variant="secondary"
                              className="px-3"
                            >
                              <RefreshCw className="size-3.5" /> Reenviar
                            </Button>
                          </form>
                          <form
                            action={manageInvitationAction.bind(
                              null,
                              organizationSlug,
                              incubatorSlug,
                            )}
                          >
                            <input
                              type="hidden"
                              name="invitationId"
                              value={invitation.id}
                            />
                            <input type="hidden" name="action" value="revoke" />
                            <ConfirmSubmitButton
                              message={`Revogar o convite enviado para ${invitation.email}?`}
                            >
                              <Trash2 className="size-3.5" /> Revogar
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
