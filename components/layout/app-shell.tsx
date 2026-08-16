"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Gavel,
  House,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { IncubatorSwitcher } from "@/components/layout/incubator-switcher";
import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  slug: string;
  icon: LucideIcon;
};

type NavigationGroup = {
  group: string;
  items: readonly NavigationItem[];
};

const navigation: readonly NavigationGroup[] = [
  {
    group: "Principal",
    items: [{ label: "Visão geral", slug: "dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Operação",
    items: [
      { label: "Seleção", slug: "chamadas", icon: Gavel },
      { label: "Startups", slug: "startups", icon: Rocket },
      { label: "Portfólio", slug: "programas", icon: BriefcaseBusiness },
      { label: "Mentorias", slug: "mentorias", icon: MessageSquare },
    ],
  },
  {
    group: "Gestão",
    items: [
      { label: "Indicadores", slug: "indicadores", icon: BarChart3 },
      { label: "CERNE", slug: "cerne", icon: ShieldCheck },
    ],
  },
  {
    group: "Sistema",
    items: [
      {
        label: "Configurações",
        slug: "gestao-incubadora",
        icon: Settings,
      },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentModule = pathSegments[4] ?? null;

  const initials = user.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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
          <div className="relative h-14 w-48 overflow-hidden rounded-2xl border border-white/12 bg-[#fffaf5]/96 shadow-[0_14px_34px_rgba(38,6,9,0.2)]">
            <Image
              src="/brand/proodos-logo-transparent.png"
              alt="Proodos"
              fill
              priority
              sizes="192px"
              className="scale-[2.35] object-contain"
            />
          </div>
          <button
            className="grid size-10 place-items-center rounded-xl text-white/75 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav
          className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden"
          aria-label="Módulos da plataforma"
        >
          <Link
            href={`/o/${organization.slug}/i/${currentIncubator.slug}/dashboard`}
            onClick={() => setMenuOpen(false)}
            className="group flex min-h-12 items-center gap-4 rounded-xl px-3 text-[0.98rem] font-semibold text-white/82 transition hover:bg-white/[0.06] hover:text-white"
          >
            <House
              className="size-5.5 text-white/70 transition group-hover:text-[#f4c47a]"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            Início
          </Link>

          <div className="mt-5 space-y-5 [@media(max-height:760px)]:mt-3 [@media(max-height:760px)]:space-y-3">
            {navigation.map(({ group, items }) => (
              <section key={group} aria-labelledby={`menu-${group}`}>
                <h2
                  id={`menu-${group}`}
                  className="px-3 pb-2 text-[0.68rem] font-black tracking-[0.17em] text-[#f4c47a] uppercase"
                >
                  {group}
                </h2>
                <ul className="space-y-0.5">
                  {items.map(({ label, slug, icon: Icon }) => {
                    const href = `/o/${organization.slug}/i/${currentIncubator.slug}/${slug}`;
                    const active =
                      currentModule === slug ||
                      (slug !== "dashboard" && pathname.startsWith(`${href}/`));
                    const primary = slug === "dashboard";

                    return (
                      <li key={slug}>
                        <Link
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex min-h-[3.35rem] items-center gap-4 rounded-xl px-3 text-[0.96rem] font-semibold tracking-[-0.01em] text-white/82 transition duration-200 hover:bg-white/[0.065] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c47a] [@media(max-height:760px)]:min-h-[2.9rem]",
                            active && primary
                              ? "bg-gradient-to-r from-[#8f171f]/88 to-[#751118]/62 text-white shadow-[0_12px_28px_rgba(38,6,9,0.24),inset_3px_0_0_#f4c47a]"
                              : active
                                ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_rgba(244,196,122,0.75)]"
                                : "",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-5.5 shrink-0 text-white/68 transition group-hover:text-[#f4c47a]",
                              active && "text-[#f4c47a]",
                            )}
                            strokeWidth={1.7}
                            aria-hidden="true"
                          />
                          <span>{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
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
