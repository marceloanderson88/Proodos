export const DEMO_DASHBOARD_DATA = {
  metrics: [
    {
      label: "Startups ativas",
      value: "28",
      detail: "+12% vs. ciclo anterior",
      tone: "positive",
    },
    {
      label: "Programas em andamento",
      value: "5",
      detail: "2 previstos para este mês",
      tone: "neutral",
    },
    {
      label: "Mentorias no mês",
      value: "36",
      detail: "+8% vs. mês anterior",
      tone: "positive",
    },
    {
      label: "Ações em andamento",
      value: "42",
      detail: "7 próximas do prazo",
      tone: "attention",
    },
  ],
  evolution: [16, 18, 21, 23, 25, 28],
  alerts: [
    {
      title: "3 diagnósticos atrasados",
      detail: "Startups com ciclos pendentes",
      tone: "critical",
    },
    {
      title: "7 ações próximas do prazo",
      detail: "Revisar responsáveis e bloqueios",
      tone: "warning",
    },
    {
      title: "2 mentorias a confirmar",
      detail: "Agenda demonstrativa",
      tone: "critical",
    },
  ],
  mentoring: [
    {
      day: "23",
      month: "MAI",
      startup: "AgroSmart",
      topic: "Validação de modelo de negócio",
      time: "10:00",
    },
    {
      day: "24",
      month: "MAI",
      startup: "EcoSertão",
      topic: "Estratégia de go-to-market",
      time: "14:00",
    },
    {
      day: "27",
      month: "MAI",
      startup: "Sertão Tech",
      topic: "Pitch e captação",
      time: "09:00",
    },
  ],
  activities: [
    {
      title: "Diagnóstico concluído",
      detail: "BioCaatinga · Maturidade",
      time: "2h",
      tone: "success",
    },
    {
      title: "Mentoria registrada",
      detail: "Sertão Tech · Pitch",
      time: "4h",
      tone: "wine",
    },
    {
      title: "Plano atualizado",
      detail: "EcoSertão · 3 ações",
      time: "6h",
      tone: "success",
    },
    {
      title: "Startup cadastrada",
      detail: "ClimaSertão",
      time: "1d",
      tone: "wine",
    },
  ],
  contents: [
    {
      type: "VÍDEO · 18 MIN",
      title: "Como validar sua ideia de negócio",
      tag: "Validação",
    },
    {
      type: "ARTIGO · 8 MIN",
      title: "Pitch perfeito: estrutura e prática",
      tag: "Pitch",
    },
    {
      type: "VÍDEO · 22 MIN",
      title: "Precificação para startups",
      tag: "Financeiro",
    },
    {
      type: "E-BOOK",
      title: "Guia de métricas para startups",
      tag: "Métricas",
    },
  ],
} as const;
