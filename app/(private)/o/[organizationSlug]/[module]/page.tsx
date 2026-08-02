import { notFound } from "next/navigation";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const dynamic = "force-dynamic";

const modules = {
  startups: {
    title: "Startups",
    description:
      "Cadastro, equipes, histórico, estágio e visão consolidada das startups serão implementados em um marco de negócio posterior.",
  },
  programas: {
    title: "Programas",
    description:
      "Tipos de programa, turmas, ciclos, critérios e participantes permanecem fora do Marco 1.",
  },
  diagnosticos: {
    title: "Diagnósticos",
    description:
      "Metodologias versionadas, critérios, respostas e validação humana serão implementados sem dependência obrigatória de CERNE.",
  },
  "planos-de-acao": {
    title: "Planos de Ação",
    description:
      "Prioridades, objetivos, ações, responsáveis, prazos e evidências serão adicionados no módulo vertical correspondente.",
  },
  mentorias: {
    title: "Mentorias",
    description:
      "Agenda, sessões, feedbacks e recomendações pertencem à Fase 2 do SDD; o item existe apenas para preparar a navegação.",
  },
  conteudos: {
    title: "Conteúdos",
    description:
      "A biblioteca formativa será ligada às ações do plano de forma muitos-para-muitos, sem criar um LMS completo.",
  },
  indicadores: {
    title: "Indicadores",
    description:
      "KPIs, metas, medições e consolidações serão alimentados por dados reais em um marco posterior.",
  },
  "gestao-incubadora": {
    title: "Gestão da Incubadora",
    description:
      "Organização, unidades, equipe, configurações e integrações dependem das decisões bloqueantes registradas no planejamento.",
  },
  configuracoes: {
    title: "Configurações",
    description:
      "Preferências, permissões e integrações serão habilitadas progressivamente, sempre com autorização no servidor e no banco.",
  },
} as const;

type ModuleSlug = keyof typeof modules;

function isModuleSlug(value: string): value is ModuleSlug {
  return Object.hasOwn(modules, value);
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; module: string }>;
}) {
  const { organizationSlug, module } = await params;
  if (!isModuleSlug(module)) notFound();
  return (
    <ModulePlaceholder
      organizationSlug={organizationSlug}
      {...modules[module]}
    />
  );
}
