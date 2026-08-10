"use client";

import {
  CalendarDays,
  ClipboardList,
  FileCheck2,
  Gavel,
  FolderKanban,
  Layers3,
  LayoutGrid,
  Link2,
  MailPlus,
  MapPinned,
  Network,
  Plus,
  Rocket,
  Settings2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  view?: string;
  suffix?: string;
  icon: typeof LayoutGrid;
  accent?: boolean;
};

const moduleNavigation: Record<string, NavigationItem[]> = {
  startups: [
    { label: "Portfólio", icon: Rocket },
    { label: "Pendentes", view: "pendentes", icon: ClipboardList },
    { label: "Convites", view: "convites", icon: MailPlus },
    { label: "Equipe e turmas", view: "vinculos", icon: Link2 },
    { label: "Cadastrar", suffix: "nova", icon: Plus, accent: true },
  ],
  programas: [
    { label: "Portfólio", icon: FolderKanban },
    { label: "Novo programa", view: "novo", icon: Plus },
    { label: "Turmas", view: "turmas", icon: UsersRound },
  ],
  chamadas: [
    { label: "Visão geral", icon: LayoutGrid },
    { label: "Chamadas", view: "calls", icon: Gavel },
    { label: "Inscrições", view: "applications", icon: ClipboardList },
    { label: "Avaliadores", view: "reviewers", icon: UsersRound },
    { label: "Avaliações", view: "reviews", icon: FileCheck2 },
    { label: "Ranking", view: "ranking", icon: Layers3 },
    { label: "Recursos", view: "appeals", icon: ClipboardList },
    { label: "Resultados", view: "results", icon: UserRoundCheck },
  ],
  diagnosticos: [
    { label: "Visão geral", icon: LayoutGrid },
    { label: "Modelos", view: "modelos", icon: Layers3 },
    { label: "Campanhas", view: "campanhas", icon: CalendarDays },
    { label: "Avaliações", view: "avaliacoes", icon: FileCheck2 },
  ],
  mentorias: [
    { label: "Visão geral", icon: LayoutGrid },
    { label: "Mentores", view: "mentores", icon: UserRoundCheck },
    { label: "Vínculos", view: "vinculos", icon: Network },
    { label: "Agenda", view: "agenda", icon: CalendarDays },
  ],
  "gestao-incubadora": [
    { label: "Operação", icon: Settings2 },
    { label: "Equipe", view: "equipe", icon: UsersRound },
    { label: "Convites", view: "convites", icon: MailPlus },
  ],
  indicadores: [
    { label: "Visão geral", icon: LayoutGrid },
    { label: "Portfólio", view: "portfolio", icon: Rocket },
    { label: "Diagnósticos", view: "diagnosticos", icon: FileCheck2 },
    { label: "Território", view: "territorio", icon: MapPinned },
  ],
};

export function ModuleSubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = pathname.split("/").filter(Boolean);
  const moduleSlug = segments[4];
  if (!moduleSlug) return null;
  const items = moduleNavigation[moduleSlug];

  if (!items) return null;

  const base = `/${segments.slice(0, 5).join("/")}`;
  const activeView = searchParams.get("view");

  return (
    <div className="border-b border-[#751118]/10 bg-white/72 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <nav
        aria-label={`Navegação do módulo ${moduleSlug}`}
        className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto py-2"
      >
        {items.map(({ label, view, suffix, icon: Icon, accent }) => {
          const viewParams =
            moduleSlug === "indicadores"
              ? new URLSearchParams(searchParams.toString())
              : new URLSearchParams();
          if (view) viewParams.set("view", view);
          else viewParams.delete("view");
          const query = viewParams.toString();
          const href = suffix
            ? `${base}/${suffix}`
            : query
              ? `${base}?${query}`
              : base;
          const active = suffix
            ? pathname === href
            : pathname === base && (view ? activeView === view : !activeView);

          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition sm:text-sm",
                accent
                  ? "ml-auto bg-[var(--wine-800)] text-white hover:bg-[var(--wine-700)]"
                  : active
                    ? "bg-[#f5e2d5] text-[var(--wine-900)] shadow-[inset_0_-2px_0_var(--wine-700)]"
                    : "text-[var(--text-muted)] hover:bg-[#fbf5ef] hover:text-[var(--wine-800)]",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
