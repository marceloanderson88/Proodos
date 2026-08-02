"use client";

import { ChevronsUpDown, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

type OrganizationSwitcherProps = {
  currentOrganization: OrganizationOption;
  organizations: OrganizationOption[];
  userId: string;
};

export function OrganizationSwitcher({
  currentOrganization,
  organizations,
  userId,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  async function selectOrganization(organization: OrganizationOption) {
    if (organization.id === currentOrganization.id) return;

    setSwitchingTo(organization.id);
    const supabase = createBrowserSupabaseClient();
    await supabase.from("user_preferences").upsert({
      user_id: userId,
      active_organization_id: organization.id,
    });
    router.push(`/o/${organization.slug}/dashboard`);
    router.refresh();
  }

  return (
    <label className="relative flex w-full items-center gap-3 rounded-2xl bg-white/8 p-3 text-left transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f4c47a] hover:bg-white/12">
      <span className="sr-only">Organização ativa</span>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fffaf5] text-sm font-black text-[#751118] shadow-sm">
        {currentOrganization.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-extrabold">
          {currentOrganization.name}
        </span>
        <span className="mt-0.5 block truncate text-[0.65rem] text-white/55">
          Organização ativa
        </span>
      </span>
      <select
        value={currentOrganization.id}
        onChange={(event) => {
          const organization = organizations.find(
            (item) => item.id === event.target.value,
          );
          if (organization) void selectOrganization(organization);
        }}
        disabled={switchingTo !== null}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-wait"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
      {switchingTo ? (
        <LoaderCircle
          className="size-4 shrink-0 animate-spin text-[#f4c47a]"
          aria-hidden="true"
        />
      ) : (
        <ChevronsUpDown
          className="size-4 shrink-0 text-white/55"
          aria-hidden="true"
        />
      )}
    </label>
  );
}
