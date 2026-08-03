import { notFound } from "next/navigation";

import { redirectLegacyOrganizationRoute } from "@/lib/incubators/server-context";

const modules = new Set([
  "diagnosticos",
  "planos-de-acao",
  "mentorias",
  "conteudos",
  "indicadores",
  "gestao-incubadora",
  "configuracoes",
]);

export default async function LegacyModulePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; module: string }>;
}) {
  const { organizationSlug, module } = await params;
  if (!modules.has(module)) notFound();
  await redirectLegacyOrganizationRoute(organizationSlug, module);
}
