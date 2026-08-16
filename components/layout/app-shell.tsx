"use client";

import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Gauge,
  Gavel,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
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
  icon?: LucideIcon;
  exposeChildren?: boolean;
};

const navigation: readonly NavigationSection[] = [
  {
    group: "Início",
    items: [{ label: "Visão geral", slug: "dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Seleção e Portfólio",
    icon: BriefcaseBusiness,
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
    group: "Desenvolvimento das Startups",
    icon: Rocket,
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
    group: "Resultados e Impacto",
    icon: BarChart3,
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
    group: "Gestão CERNE",
    icon: ShieldCheck,
    exposeChildren: true,
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
    group: "Configurações",
    icon: Settings,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentModule = pathSegments[4] ?? null;
  const activeView = searchParams.get("view");
  const currentSection =
    navigation.find(({ items }) =>
      items.some(({ slug }) => slug === currentModule),
    )?.group ?? null;
  const [navigationState, setNavigationState] = useState<{
    pathname: string;
    expandedSection: string | null;
    expandedModule: string | null;
  }>({
    pathname,
    expandedSection: currentSection === "Início" ? null : currentSection,
    expandedModule: currentModule,
  });
  const expandedSection =
    navigationState.pathname === pathname
      ? navigationState.expandedSection
      : currentSection === "Início"
        ? null
        : currentSection;
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

  const renderNavigationChildren = (
    children: readonly NavigationChild[],
    slug: string,
    href: string,
  ) =>
    children.map((child) => {
      const childParams =
        slug === "indicadores" && currentModule === slug
          ? new URLSearchParams(searchParams.toString())
          : new URLSearchParams();
      if (child.view) childParams.set("view", child.view);
      else childParams.delete("view");
      const query = childParams.toString();
      const childHref = query ? `${href}?${query}` : href;
      const childActive =
        pathname === href &&
        (child.view ? activeView === child.view : !activeView);

      return (
        <li key={`${slug}-${child.label}`}>
          <Link
            href={childHref}
            onClick={() => setMenuOpen(false)}
            aria-current={childActive ? "page" : undefined}
            className={cn(
              "group/sub flex min-h-8 items-center gap-2 rounded-lg px-3 py-1.5 text-xs leading-4 font-semibold text-white/62 transition",
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
    });

  return (
    <div
      className={cn(
        "min-h-screen bg-[#fbf5ef] transition-[grid-template-columns] duration-300 lg:grid",
        sidebarCollapsed ? "lg:grid-cols-[0_1fr]" : "lg:grid-cols-[19rem_1fr]",
      )}
    >
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
          "wine-panel fixed inset-y-0 left-0 z-40 flex w-[19rem] flex-col overflow-hidden border-r border-white/10 text-white shadow-[18px_0_60px_rgba(63,9,13,0.18)] transition-[width,transform,box-shadow] duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "lg:w-0 lg:-translate-x-full lg:shadow-none",
        )}
      >
        <div className="flex items-center justify-between px-6 pt-7 pb-5 [@media(max-height:760px)]:pt-4 [@media(max-height:760px)]:pb-3">
          {currentIncubator.slug.includes("sertao-maker") ? (
            <BrandMark className="sidebar-brand max-w-[14rem]" />
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
          className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden"
          aria-label="Módulos da plataforma"
        >
          <div>
            {navigation.map(
              ({ group, items, icon: SectionIcon, exposeChildren }) => {
                const isHomeSection = group === "Início";
                const sectionExpanded = expandedSection === group;
                const sectionActive = items.some(({ slug }) => {
                  const itemHref = `/o/${organization.slug}/i/${currentIncubator.slug}/${slug}`;
                  return (
                    pathname === itemHref ||
                    (slug !== "dashboard" &&
                      pathname.startsWith(`${itemHref}/`))
                  );
                });
                const sectionId = `nav-section-${group
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`;

                return (
                  <section
                    key={group}
                    className={cn(
                      !isHomeSection && "border-b border-white/10",
                      sectionExpanded && !isHomeSection && "pb-2",
                    )}
                  >
                    {isHomeSection ? (
                      <p className="px-2 pt-1 pb-2.5 text-[0.64rem] font-black tracking-[0.2em] text-[#e7aeb0]/75 uppercase">
                        {group}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setNavigationState({
                            pathname,
                            expandedSection: sectionExpanded ? null : group,
                            expandedModule:
                              !sectionExpanded && sectionActive
                                ? currentModule
                                : null,
                          })
                        }
                        aria-expanded={sectionExpanded}
                        aria-controls={sectionId}
                        className={cn(
                          "group/section flex min-h-[4.15rem] w-full items-center gap-3 px-2 py-3 text-left transition duration-200 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c47a] [@media(max-height:760px)]:min-h-[3.5rem] [@media(max-height:760px)]:py-2",
                          sectionActive
                            ? "text-white"
                            : "text-white/82 hover:text-white",
                        )}
                      >
                        {SectionIcon && (
                          <span
                            className={cn(
                              "grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#eab8b8] transition duration-200 group-hover/section:border-[#f4c47a]/35 group-hover/section:bg-white/[0.08] group-hover/section:text-[#f4c47a]",
                              (sectionActive || sectionExpanded) &&
                                "border-[#f4c47a]/30 bg-[#f4c47a]/10 text-[#f4c47a]",
                            )}
                          >
                            <SectionIcon
                              className="size-5"
                              strokeWidth={1.7}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 text-[0.91rem] leading-[1.25rem] font-bold tracking-[-0.01em]">
                          {group}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-white/50 transition-transform duration-200 group-hover/section:text-white/80",
                            sectionExpanded && "rotate-180 text-[#f4c47a]",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                    <div
                      id={isHomeSection ? undefined : sectionId}
                      hidden={!isHomeSection && !sectionExpanded}
                      className={cn(isHomeSection && "pb-3")}
                    >
                      <ul className="space-y-0.5">
                        {items.map((item) => {
                          const { label, slug, icon: Icon, children } = item;
                          const href = `/o/${organization.slug}/i/${currentIncubator.slug}/${slug}`;
                          const active =
                            pathname === href ||
                            (slug !== "dashboard" &&
                              pathname.startsWith(`${href}/`));
                          const expanded = expandedModule === slug;

                          return (
                            <li key={slug}>
                              {children?.length ? (
                                exposeChildren ? (
                                  <div className="mx-2 border-l border-[#f4c47a]/25 py-1 pl-3">
                                    <ul className="space-y-0.5">
                                      {renderNavigationChildren(
                                        children,
                                        slug,
                                        href,
                                      )}
                                    </ul>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setNavigationState({
                                          pathname,
                                          expandedSection: group,
                                          expandedModule:
                                            expandedModule === slug
                                              ? null
                                              : slug,
                                        })
                                      }
                                      aria-expanded={expanded}
                                      aria-controls={`submenu-${slug}`}
                                      className={cn(
                                        "group mx-1 flex w-[calc(100%_-_0.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/72 transition",
                                        active
                                          ? "bg-white/12 text-white shadow-[inset_2px_0_0_#f4c47a]"
                                          : "hover:bg-white/[0.07] hover:text-white",
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
                                      <span className="min-w-0 flex-1">
                                        {label}
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "size-4 shrink-0 text-white/50 transition-transform duration-200",
                                          expanded &&
                                            "rotate-180 text-[#f4c47a]",
                                        )}
                                        aria-hidden="true"
                                      />
                                    </button>
                                    <div
                                      id={`submenu-${slug}`}
                                      hidden={!expanded}
                                      className="ml-[1.35rem] border-l border-white/12 py-0.5 pl-3"
                                    >
                                      <ul className="space-y-0.5">
                                        {renderNavigationChildren(
                                          children,
                                          slug,
                                          href,
                                        )}
                                      </ul>
                                    </div>
                                  </>
                                )
                              ) : (
                                <Link
                                  href={href}
                                  onClick={() => setMenuOpen(false)}
                                  aria-current={active ? "page" : undefined}
                                  className={cn(
                                    "group flex items-center gap-3 text-sm font-bold transition",
                                    isHomeSection
                                      ? "min-h-[4.25rem] rounded-[1.35rem] border px-3 py-2.5 text-base [@media(max-height:760px)]:min-h-[3.65rem]"
                                      : "rounded-xl px-3.5 py-2.5 text-white/78",
                                    active && isHomeSection
                                      ? "border-[#f4c47a]/70 bg-gradient-to-r from-[#a71922]/90 to-[#8c1720]/70 text-white shadow-[0_14px_30px_rgba(38,6,9,0.28),inset_2px_0_0_#f4c47a]"
                                      : active
                                        ? "bg-white/13 text-white shadow-[inset_3px_0_0_#f4c47a]"
                                        : "border-transparent hover:bg-white/8 hover:text-white",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "grid shrink-0 place-items-center transition",
                                      isHomeSection
                                        ? "size-11 rounded-xl bg-[#681015]/55"
                                        : "size-5",
                                      active && "text-[#f4c47a]",
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        isHomeSection
                                          ? "size-[1.35rem]"
                                          : "size-[1.15rem]",
                                        active
                                          ? "text-[#f4c47a]"
                                          : "text-white/68 group-hover:text-white",
                                      )}
                                      strokeWidth={1.8}
                                      aria-hidden="true"
                                    />
                                  </span>
                                  <span className="tracking-[-0.01em]">
                                    {label}
                                  </span>
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </section>
                );
              },
            )}
          </div>
        </nav>
        <div className="relative border-t border-white/10 p-3">
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
          <div className="relative mx-1 mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [@media(max-height:700px)]:hidden">
            <Sparkles
              className="size-5 shrink-0 text-[#f4c47a]"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <p className="text-[0.72rem] leading-4 font-semibold text-white/72">
              Impulsionando ideias.
              <span className="block text-[#f4c47a]">
                Transformando o sertão.
              </span>
            </p>
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
            <button
              type="button"
              className="hidden size-9 shrink-0 place-items-center rounded-lg border border-[#751118]/10 bg-white text-[#751118] shadow-sm transition hover:border-[#751118]/20 hover:bg-[#fff8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a71922] lg:grid"
              aria-controls="navegacao-principal"
              aria-expanded={!sidebarCollapsed}
              aria-label={
                sidebarCollapsed
                  ? "Mostrar menu lateral"
                  : "Esconder menu lateral"
              }
              title={
                sidebarCollapsed
                  ? "Mostrar menu lateral"
                  : "Esconder menu lateral"
              }
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4.5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="size-4.5" aria-hidden="true" />
              )}
            </button>
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
