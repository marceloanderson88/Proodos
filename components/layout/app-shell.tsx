"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Gauge,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Rocket,
  Search,
  Settings,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", slug: "dashboard", icon: LayoutDashboard },
  { label: "Startups", slug: "startups", icon: Rocket },
  { label: "Programas", slug: "programas", icon: Target },
  { label: "Diagnósticos", slug: "diagnosticos", icon: ClipboardCheck },
  { label: "Planos de Ação", slug: "planos-de-acao", icon: Gauge },
  { label: "Mentorias", slug: "mentorias", icon: UsersRound },
  { label: "Conteúdos", slug: "conteudos", icon: BookOpen },
  { label: "Indicadores", slug: "indicadores", icon: BarChart3 },
  { label: "Gestão da Incubadora", slug: "gestao-incubadora", icon: Building2 },
  { label: "Configurações", slug: "configuracoes", icon: Settings },
] as const;

type AppShellProps = {
  organizationSlug: string;
  user: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
  children: React.ReactNode;
};

export function AppShell({ organizationSlug, user, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
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
          <BrandMark inverse />
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
          <ul className="space-y-1">
            {navigation.map(({ label, slug, icon: Icon }) => {
              const href = `/o/${organizationSlug}/${slug}`;
              const active =
                pathname === href ||
                (slug !== "dashboard" && pathname.startsWith(`${href}/`));
              return (
                <li key={slug}>
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
                </li>
              );
            })}
          </ul>
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
          <div className="relative flex items-center gap-3 rounded-2xl bg-white/8 p-3">
            <BrandMark
              compact
              className="grid size-10 place-items-center rounded-xl bg-[#fffaf5] shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">Sertão Maker</p>
              <p className="mt-0.5 truncate text-[0.65rem] text-white/55">
                Ambiente demonstrativo
              </p>
            </div>
            <ChevronDown className="size-4 text-white/55" aria-hidden="true" />
          </div>
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
            <label className="relative ml-auto hidden max-w-md flex-1 sm:block">
              <span className="sr-only">Busca indisponível no Marco 1</span>
              <Search
                className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#9b8e88]"
                aria-hidden="true"
              />
              <input
                readOnly
                value=""
                placeholder="Busca disponível em marco futuro"
                className="w-full rounded-xl border border-[#751118]/10 bg-white/80 py-3 pr-4 pl-11 text-sm text-[#625050] shadow-sm outline-none placeholder:text-[#a99e99]"
              />
            </label>
            <button
              className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-[#751118]/10 bg-white text-[#625050]"
              aria-label="Notificações demonstrativas"
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#ad2b2f]" />
            </button>
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
          Sessão autenticada · dados do dashboard continuam demonstrativos no
          Marco 2
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
