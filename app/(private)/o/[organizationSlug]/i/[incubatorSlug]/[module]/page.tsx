import { notFound } from "next/navigation";

import { FileIntegrationFoundation } from "@/components/files/file-integration-foundation";
import { ModulePlaceholder } from "@/components/module-placeholder";

const modules = {
  diagnosticos: {
    title: "Diagnósticos",
    description:
      "Diagnósticos serão aplicados às startups desta incubadora a partir de templates independentes e versionados.",
  },
  "planos-de-acao": {
    title: "Planos de Ação",
    description:
      "Os planos pertencem às startups desta incubadora e poderão relacionar ações a conteúdos e trilhas formativas.",
  },
  mentorias: {
    title: "Mentorias",
    description:
      "Agenda, sessões, mentores e recomendações serão gerenciados no contexto desta incubadora.",
  },
  conteudos: {
    title: "Conteúdos e trilhas",
    description:
      "A incubadora poderá usar o catálogo compartilhado do Proodos e manter trilhas próprias, sem transformar a plataforma em um LMS completo.",
  },
  indicadores: {
    title: "Indicadores",
    description:
      "Os indicadores desta área representarão somente a incubadora ativa; consolidações ficam no painel Proodos.",
  },
  "gestao-incubadora": {
    title: "Gestão da Incubadora",
    description:
      "Equipe, papéis locais, identidade e configurações operacionais desta incubadora serão centralizados aqui.",
  },
  configuracoes: {
    title: "Configurações",
    description:
      "Preferências e integrações serão aplicadas com autorização no escopo da incubadora.",
  },
} as const;

type ModuleSlug = keyof typeof modules;
function isModuleSlug(value: string): value is ModuleSlug {
  return Object.hasOwn(modules, value);
}

export default async function IncubatorModulePage({
  params,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    module: string;
  }>;
}) {
  const { organizationSlug, incubatorSlug, module } = await params;
  if (!isModuleSlug(module)) notFound();
  if (module === "configuracoes")
    return <FileIntegrationFoundation organizationSlug={organizationSlug} />;
  return (
    <ModulePlaceholder
      organizationSlug={organizationSlug}
      dashboardHref={`/o/${organizationSlug}/i/${incubatorSlug}/dashboard`}
      {...modules[module]}
    />
  );
}
