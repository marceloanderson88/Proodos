import { ShieldCheck, Trash2, UserRoundPlus, UsersRound } from "lucide-react";

import {
  assignIncubatorPersonRoleAction,
  removeIncubatorPersonRoleAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/people-actions";
import { FeedbackBanner } from "@/components/m6/feedback-banner";
import {
  Field,
  inputClassName,
  SubmitButton,
} from "@/components/m6/form-controls";

type Person = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
};

type Role = { id: string; name: string; description: string };
type Assignment = {
  id: string;
  membershipId: string;
  roleId: string;
};

export function IncubatorPeopleManagement({
  organizationSlug,
  incubatorSlug,
  incubatorName,
  people,
  roles,
  assignments,
  success,
  error,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  incubatorName: string;
  people: Person[];
  roles: Role[];
  assignments: Assignment[];
  success?: string;
  error?: string;
}) {
  return (
    <div className="page-enter space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-[#751118]/10 bg-[#fffdf9] shadow-[0_18px_45px_rgb(63_9_13/7%)]">
        <div className="relative px-6 py-8 sm:px-8">
          <div
            className="dot-field absolute inset-y-0 right-0 w-64 opacity-35"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf7ee] px-3 py-1.5 text-[0.65rem] font-black tracking-[0.12em] text-[#27643a] uppercase">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Papéis protegidos por RLS
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] text-[#3f090d] sm:text-5xl">
              Pessoas da incubadora
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#766868]">
              Defina quem atua na {incubatorName} e qual papel cada pessoa
              exerce. Uma mesma pessoa pode acumular papéis quando necessário.
            </p>
          </div>
        </div>
      </header>

      <FeedbackBanner success={success} error={error} />

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f3dfd0] text-[#751118]">
              <UserRoundPlus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                Nova atribuição
              </p>
              <h2 className="text-xl font-black text-[#3f090d]">
                Pessoa e papel
              </h2>
            </div>
          </div>
          <form
            action={assignIncubatorPersonRoleAction.bind(
              null,
              organizationSlug,
              incubatorSlug,
            )}
            className="mt-5 space-y-4 border-t border-[#751118]/8 pt-5"
          >
            <Field
              label="Pessoa"
              name="membershipId"
              hint="São exibidos os membros ativos do Proodos."
            >
              <select className={inputClassName} name="membershipId" required>
                <option value="">Selecione</option>
                {people.map((person) => (
                  <option key={person.membershipId} value={person.membershipId}>
                    {person.displayName} · {person.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Papel na incubadora" name="roleId">
              <select className={inputClassName} name="roleId" required>
                <option value="">Selecione</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Atribuir papel</SubmitButton>
          </form>
          <p className="mt-4 rounded-xl bg-[#fff4de] px-4 py-3 text-xs leading-5 text-[#70440d]">
            Para uma pessoa aparecer aqui, ela precisa ter uma conta e um
            vínculo ativo com o Proodos. O envio automatizado de convites por
            e-mail será tratado no fluxo de convites.
          </p>
        </div>

        <div className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f3dfd0] text-[#751118]">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black tracking-[0.12em] text-[#921a20] uppercase">
                Equipe atual
              </p>
              <h2 className="text-xl font-black text-[#3f090d]">
                Papéis atribuídos
              </h2>
            </div>
          </div>

          {assignments.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-[#751118]/15 p-8 text-center text-sm text-[#806f6b]">
              Nenhum papel local foi atribuído nesta incubadora.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {assignments.map((assignment) => {
                const person = people.find(
                  (item) => item.membershipId === assignment.membershipId,
                );
                const role = roles.find(
                  (item) => item.id === assignment.roleId,
                );
                return (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#751118]/8 bg-white/70 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#3f090d]">
                        {person?.displayName ?? "Pessoa indisponível"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#921a20]">
                        {role?.name ?? "Papel indisponível"}
                      </p>
                      <p className="mt-1 truncate text-[0.65rem] text-[#887875]">
                        {person?.email}
                      </p>
                    </div>
                    <form
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
                        type="submit"
                        className="grid size-10 place-items-center rounded-xl border border-[#921a20]/15 text-[#751118] transition hover:bg-[#fff1eb]"
                        aria-label={`Remover papel ${role?.name ?? "atribuído"} de ${person?.displayName ?? "pessoa"}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
