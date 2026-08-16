"use client";

import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Gauge,
  Gavel,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Rocket,
  Settings,
  ShieldCheck,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { IncubatorSwitcher } from "@/components/layout/incubator-switcher";
import { cn } from "@/lib/utils";

type NavigationChild = {
  label: string;
  view?: string;
};

type NavigationModule = {
  label: string;
  slug: string;
  icon: LucideIcon;
  children?: readonly NavigationChild[];
};

type NavigationSection = {
  group: string;
  items: readonly NavigationModule[];
};

const navigation: readonly NavigationSection[] = [
  {
    group: "Início",
    items: [{ label: "Dashboard", slug: "dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Portfólio",
    items: [
      {
        label: "Programas e turmas",
        slug: "programas",
        icon: Target,
        children: [
          { label: "Catálogo de programas" },
          { label: "Turmas e ciclos", view: "turmas" },
        ],
      },
      {
        label: "Chamadas e seleção",
        slug: "chamadas",
        icon: Gavel,
        children: [
          { label: "Visão geral" },
          { label: "Chamadas", view: "calls" },
          { label: "Inscrições", view: "applications" },
          { label: "Avaliadores", view: "reviewers" },
          { label: "Avaliações", view: "reviews" },
          { label: "Classificação", view: "ranking" },
          { label: "Recursos", view: "appeals" },
          { label: "Resultados da seleção", view: "results" },
        ],
      },
      {
        label: "Startups",
        slug: "startups",
        icon: Rocket,
        children: [
          { label: "Portfólio de startups" },
          { label: "Solicitações pendentes", view: "pendentes" },
          { label: "Convites", view: "convites" },
          { label: "Equipes e vínculos", view: "vinculos" },
        ],
      },
    ],
  },
  {
    group: "Desenvolvimento",
    items: [
      {
        label: "Diagnósticos",
        slug: "diagnosticos",
        icon: ClipboardCheck,
        children: [
          { label: "Visão geral" },
          { label: "Modelos", view: "modelos" },
          { label: "Campanhas", view: "campanhas" },
          { label: "Avaliações", view: "avaliacoes" },
        ],
      },
      { label: "Planos de ação", slug: "planos-de-acao", icon: Gauge },
      { label: "Trilhas e conteúdos", slug: "conteudos", icon: BookOpen },
      {
        label: "Mentorias",
        slug: "mentorias",
        icon: UsersRound,
        children: [
          { label: "Visão geral" },
          { label: "Mentores", view: "mentores" },
          { label: "Equipes por turma", view: "equipe" },
          { label: "Rodadas", view: "rodadas" },
          { label: "Vínculos", view: "vinculos" },
          { label: "Agenda", view: "agenda" },
        ],
      },
    ],
  },
  {
    group: "Resultados",
    items: [
      {
        label: "Relatórios e indicadores",
        slug: "indicadores",
        icon: BarChart3,
        children: [
          { label: "Visão geral" },
          { label: "Portfólio", view: "portfolio" },
          { label: "Diagnósticos", view: "diagnosticos" },
          { label: "Território", view: "territorio" },
        ],
      },
    ],
  },
  {
    group: "Qualidade e CERNE",
    items: [
      {
        label: "CERNE",
        slug: "cerne",
        icon: ShieldCheck,
        children: [
          { label: "Visão geral" },
          { label: "Matriz de práticas", view: "matrix" },
          { label: "Plano de evidências", view: "plan" },
          { label: "Evidências", view: "evidences" },
          { label: "Pendências e alertas", view: "alerts" },
          { label: "Fontes no Drive", view: "drive" },
          { label: "Avaliação e validação", view: "review" },
        ],
      },
    ],
  },
  {
    group: "Administração",
    items: [
      {
        label: "Incubadora",
        slug: "gestao-incubadora",
        icon: Building2,
        children: [
          { label: "Perfil e operação" },
          { label: "Equipe e permissões", view: "equipe" },
          { label: "Convites de acesso", view: "convites" },
        ],
      },
      { label: "Integrações", slug: "configuracoes", icon: Settings },
    ],
  },
];

type AppShellProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  currentIncubator: {
    id: string;
    name: string;
    slug: string;
  };
  incubators: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
  children: React.ReactNode;
};

export function AppShell({
  organization,
  currentIncubator,
  incubators,
  user,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentModule = pathSegments[4] ?? null;
  const activeView = searchParams.get("view");
  const [navigationState, setNavigationState] = useState<{
    pathname: string;
    expandedModule: string | null;
  }>({ pathname, expandedModule: currentModule });
  const expandedModule =
    navigationState.pathname === pathname
      ? navigationState.expandedModule
      : currentModule;

  const initials = user.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#fbf5ef] lg:grid lg:grid-cols-[17.5rem_1fr]">
      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-[#260609]/55 backdrop-blur-sm lg:hidden"
          aria-label="Fechar menu lateral"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="navegacao-principal"
        className={cn(
          "wine-panel fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col overflow-hidden text-white shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          {currentIncubator.slug.includes("sertao-maker") ? (
            <BrandMark inverse />
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-black text-[#f4c47a]">
                {currentIncubator.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black tracking-[0.12em] text-white/55 uppercase">
                  Proodos
                </p>
                <p className="truncate text-sm font-black text-white">
                  {currentIncubator.name}
                </p>
              </div>
            </div>
          )}
          <button
            className="grid size-10 place-items-center rounded-xl text-white/75 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav
          className="mt-2 flex-1 overflow-y-auto px-3 pb-4"
          aria-label="Módulos da plataforma"
        >
          <div className="space-y-5">
            {navigation.map(({ group, items }) => (
              <section key={group}>
                <p className="px-3.5 pb-2 text-[0.58rem] font-extrabold tracking-[0.14em] text-white/42 uppercase">
                  {group}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const { label, slug, icon: Icon, children } = item;
                    const href = `/o/${organization.slug}/i/${currentIncubator.slug}/${slug}`;
                    const active =
                      pathname === href ||
                      (slug !== "dashboard" && pathname.startsWith(`${href}/`));
                    const expanded = expandedModule === slug;

                    return (
                      <li key={slug}>
                        {children?.length ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setNavigationState({
                                  pathname,
                                  expandedModule:
                                    expandedModule === slug ? null : slug,
                                })
                              }
                              aria-expanded={expanded}
                              aria-controls={`submenu-${slug}`}
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-bold text-white/78 transition",
                                active
                                  ? "bg-white/13 text-white shadow-[inset_3px_0_0_#f4c47a]"
                                  : "hover:bg-white/8 hover:text-white",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-[1.15rem] shrink-0",
                                  active
                                    ? "text-[#f4c47a]"
                                    : "text-white/68 group-hover:text-white",
                                )}
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1">{label}</span>
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-white/50 transition-transform duration-200",
                                  expanded && "rotate-180 text-[#f4c47a]",
                                )}
                                aria-hidden="true"
                              />
                            </button>
                            <div
                              id={`submenu-${slug}`}
                              hidden={!expanded}
                              className="ml-[1.35rem] border-l border-white/12 py-1 pl-3"
                            >
                              <ul className="space-y-0.5">
                                {children.map((child) => {
                                  const childParams =
                                    slug === "indicadores" &&
                                    currentModule === slug
                                      ? new URLSearchParams(
                                          searchParams.toString(),
                                        )
                                      : new URLSearchParams();
                                  if (child.view)
                                    childParams.set("view", child.view);
                                  else childParams.delete("view");
                                  const query = childParams.toString();
                                  const childHref = query
                                    ? `${href}?${query}`
                                    : href;
                                  const childActive =
                                    pathname === href &&
                                    (child.view
                                      ? activeView === child.view
                                      : !activeView);

                                  return (
                                    <li key={`${slug}-${child.label}`}>
                                      <Link
                                        href={childHref}
                                        onClick={() => setMenuOpen(false)}
                                        aria-current={
                                          childActive ? "page" : undefined
                                        }
                                        className={cn(
                                          "group/sub flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs leading-4 font-semibold text-white/62 transition",
                                          childActive
                                            ? "bg-[#f4c47a]/14 text-[#ffe2ad]"
                                            : "hover:bg-white/7 hover:text-white",
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "size-1.5 shrink-0 rounded-full bg-white/24 transition",
                                            childActive
                                              ? "bg-[#f4c47a] shadow-[0_0_0_3px_rgba(244,196,122,0.12)]"
                                              : "group-hover/sub:bg-white/55",
                                          )}
                                          aria-hidden="true"
                                        />
                                        <span>{child.label}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </>
                        ) : (
                          <Link
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-white/78 transition",
                              active
                                ? "bg-white/13 text-white shadow-[inset_3px_0_0_#f4c47a]"
                                : "hover:bg-white/8 hover:text-white",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-[1.15rem]",
                                active
                                  ? "text-[#f4c47a]"
                                  : "text-white/68 group-hover:text-white",
                              )}
                              strokeWidth={1.8}
                              aria-hidden="true"
                            />
                            <span>{label}</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>
        <div className="relative border-t border-white/10 p-4">
          <div
            className="absolute inset-x-0 bottom-0 h-28 opacity-20"
            aria-hidden="true"
          >
            <svg viewBox="0 0 280 100" className="h-full w-full">
              <path
                d="M0 80 C50 20 90 100 140 54 C190 8 230 75 280 34"
                fill="none"
                stroke="#f4c47a"
              />
              <path
                d="M205 78V28m0 16-12-12m12 3 12-10"
                stroke="#f4c47a"
                fill="none"
              />
            </svg>
          </div>
          <IncubatorSwitcher
            organizationSlug={organization.slug}
            currentIncubator={currentIncubator}
            incubators={incubators}
          />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#751118]/8 bg-[#fbf5ef]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3">
            <button
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#751118]/10 bg-white text-[#751118] lg:hidden"
              aria-controls="navegacao-principal"
              aria-expanded={menuOpen}
              aria-label="Abrir menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <PanelLeftClose
              className="hidden size-5 text-[#9b8e88] lg:block"
              aria-hidden="true"
            />
            <div className="ml-auto hidden min-w-0 sm:block">
              <p className="truncate text-xs font-extrabold text-[var(--wine-900)]">
                {currentIncubator.name}
              </p>
              <p className="text-[0.65rem] text-[var(--text-muted)]">
                Ambiente operacional
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#751118]/10 bg-white px-2.5 py-2 shadow-sm">
              <div className="grid size-8 place-items-center rounded-full bg-[#751118] text-xs font-black text-white">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-36 truncate text-xs font-black text-[#3f090d]">
                  {user.displayName}
                </p>
                <p className="max-w-36 truncate text-[0.65rem] text-[#8b7c76]">
                  {user.email}
                </p>
              </div>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-lg px-2 py-1 text-xs font-bold text-[#751118] hover:bg-[#751118]/7"
                  aria-label="Sair da conta"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>
        <div
          className="border-b border-[#d97918]/20 bg-[#fff4de] px-4 py-2 text-center text-xs font-bold text-[#70440d] sm:px-6"
          role="status"
        >
          Proodos · {currentIncubator.name} · acesso protegido por RLS
        </div>
        <main
          id="conteudo-principal"
          className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
