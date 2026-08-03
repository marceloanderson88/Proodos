"use client";

import { ArrowLeft, ChevronsUpDown, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type IncubatorOption = { id: string; name: string; slug: string };

export function IncubatorSwitcher({
  organizationSlug,
  currentIncubator,
  incubators,
}: {
  organizationSlug: string;
  currentIncubator: IncubatorOption;
  incubators: IncubatorOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const activeModule =
    [
      "dashboard",
      "startups",
      "programas",
      "diagnosticos",
      "planos-de-acao",
      "mentorias",
      "conteudos",
      "indicadores",
      "gestao-incubadora",
      "configuracoes",
    ].find((item) => pathname.includes(`/${item}`)) ?? "dashboard";

  return (
    <div className="space-y-2">
      <label className="relative flex w-full items-center gap-3 rounded-2xl bg-white/8 p-3 text-left transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f4c47a] hover:bg-white/12">
        <span className="sr-only">Incubadora ativa</span>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fffaf5] text-sm font-black text-[#751118] shadow-sm">
          {currentIncubator.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold">
            {currentIncubator.name}
          </span>
          <span className="mt-0.5 block text-[0.65rem] text-white/55">
            Incubadora ativa
          </span>
        </span>
        <select
          value={currentIncubator.id}
          disabled={switching}
          onChange={(event) => {
            const selected = incubators.find(
              (item) => item.id === event.target.value,
            );
            if (!selected || selected.id === currentIncubator.id) return;
            setSwitching(true);
            router.push(
              `/o/${organizationSlug}/i/${selected.slug}/${activeModule}`,
            );
          }}
          className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-wait"
        >
          {incubators.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {switching ? (
          <LoaderCircle className="size-4 animate-spin text-[#f4c47a]" />
        ) : (
          <ChevronsUpDown className="size-4 text-white/55" />
        )}
      </label>
      <Link
        href="/o"
        className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[0.68rem] font-black text-white/60 hover:bg-white/8 hover:text-white"
      >
        <ArrowLeft className="size-3.5" /> Administração Proodos
      </Link>
    </div>
  );
}
