import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDot,
  Flag,
  Play,
  Rocket,
  Target,
  UsersRound,
} from "lucide-react";

import { DEMO_DASHBOARD_DATA } from "@/lib/demo-dashboard-data";
import { cn } from "@/lib/utils";

const metricIcons = [Rocket, Flag, UsersRound, Target] as const;
const months = ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"] as const;

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-[family-name:var(--font-body)] text-sm font-black text-[#5c0c12] sm:text-base">
        {children}
      </h2>
      {action && (
        <span className="text-xs font-extrabold text-[#921a20]">{action}</span>
      )}
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div className="page-enter space-y-5 sm:space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ad2b2f]/15 bg-[#ad2b2f]/8 px-3 py-1.5 text-[0.65rem] font-black tracking-[0.14em] text-[#751118] uppercase">
            <CircleDot className="size-3" aria-hidden="true" />
            Dados demonstrativos
          </div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#3f090d] sm:text-5xl">
            Olá, Marcelo <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#766868]">
            Acompanhe a evolução da incubadora e das startups.
          </p>
        </div>
        <p className="max-w-sm rounded-xl border border-[#d97918]/20 bg-[#fff4de] px-4 py-3 text-xs leading-5 text-[#70440d]">
          Todos os nomes, números e atividades desta página são fictícios e
          existem somente para validar o shell visual.
        </p>
      </header>

      <section
        aria-label="Indicadores demonstrativos"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {DEMO_DASHBOARD_DATA.metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? Target;
          return (
            <article
              key={metric.label}
              className="dashboard-card stagger-item flex items-center gap-4 rounded-2xl p-4 sm:p-5"
              style={{ "--stagger": index + 1 } as React.CSSProperties}
            >
              <div className="grid size-14 shrink-0 place-items-center rounded-[1.2rem] bg-[#f3dfd0] text-[#5c0c12]">
                <Icon className="size-6" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.65rem] font-black tracking-[0.08em] text-[#766868] uppercase">
                  {metric.label}
                </p>
                <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#251515]">
                  {metric.value}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-[0.68rem] font-bold",
                    metric.tone === "positive"
                      ? "text-[#3d8b51]"
                      : metric.tone === "attention"
                        ? "text-[#ad2b2f]"
                        : "text-[#8b7c76]",
                  )}
                >
                  {metric.detail}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr_1fr]">
        <article className="dashboard-card rounded-2xl p-5">
          <SectionTitle action="Últimos 6 meses">
            Evolução de startups ativas
          </SectionTitle>
          <div className="mt-5 overflow-hidden">
            <svg
              viewBox="0 0 520 210"
              className="h-auto w-full"
              role="img"
              aria-labelledby="evolution-title evolution-description"
            >
              <title id="evolution-title">
                Evolução demonstrativa de startups ativas
              </title>
              <desc id="evolution-description">
                Crescimento fictício de 16 para 28 startups em seis meses.
              </desc>
              {[35, 85, 135, 185].map((y) => (
                <line
                  key={y}
                  x1="40"
                  x2="500"
                  y1={y}
                  y2={y}
                  stroke="#eadfd8"
                  strokeWidth="1"
                />
              ))}
              <path
                d="M55 158 L140 144 L225 120 L310 105 L395 90 L480 65 L480 185 L55 185Z"
                fill="url(#areaGradient)"
              />
              <path
                d="M55 158 L140 144 L225 120 L310 105 L395 90 L480 65"
                fill="none"
                stroke="#921a20"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ad2b2f" stopOpacity="0.2" />
                  <stop offset="1" stopColor="#ad2b2f" stopOpacity="0" />
                </linearGradient>
              </defs>
              {DEMO_DASHBOARD_DATA.evolution.map((value, index) => {
                const x = 55 + index * 85;
                const y = [158, 144, 120, 105, 90, 65][index] ?? 185;
                return (
                  <g key={months[index]}>
                    <circle cx={x} cy={y} r="5" fill="#921a20" />
                    <text
                      x={x}
                      y={y - 13}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="800"
                      fill="#3f090d"
                    >
                      {value}
                    </text>
                    <text
                      x={x}
                      y="205"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#887875"
                    >
                      {months[index]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        <article className="dashboard-card rounded-2xl p-5">
          <SectionTitle>Maturidade das startups</SectionTitle>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
            <div
              className="relative grid size-44 shrink-0 place-items-center rounded-full"
              style={{
                background:
                  "conic-gradient(#cf6364 0 22%, #df9e72 22% 41%, #ebc455 41% 61%, #9bcbb0 61% 82%, #71b697 82% 100%)",
              }}
            >
              <div className="grid size-32 place-items-center rounded-full border-[10px] border-[#fffdf9] bg-white text-center shadow-inner">
                <div>
                  <p className="text-[0.6rem] font-black tracking-[0.12em] text-[#8b7c76] uppercase">
                    Média geral
                  </p>
                  <p className="text-4xl font-black text-[#2a1717]">3,2</p>
                  <p className="text-xs text-[#8b7c76]">/5</p>
                </div>
              </div>
            </div>
            <dl className="w-full space-y-3 text-xs">
              {[
                ["Ideia e validação", "2,1", "#cf6364"],
                ["Produto", "3,0", "#df9e72"],
                ["Mercado", "3,6", "#ebc455"],
                ["Gestão", "3,4", "#9bcbb0"],
                ["Financeiro", "2,7", "#71b697"],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <dt className="flex-1 text-[#6e6060]">{label}</dt>
                  <dd className="font-black text-[#3f090d]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <article className="dashboard-card rounded-2xl p-5">
          <SectionTitle action="Ver todos">Alertas críticos</SectionTitle>
          <div className="mt-5 space-y-3">
            {DEMO_DASHBOARD_DATA.alerts.map((alert) => (
              <div
                key={alert.title}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3.5",
                  alert.tone === "warning"
                    ? "border-[#d97918]/12 bg-[#fff2e4]"
                    : "border-[#ad2b2f]/10 bg-[#fceaea]",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    alert.tone === "warning"
                      ? "bg-[#d97918] text-white"
                      : "bg-[#ad2b2f] text-white",
                  )}
                >
                  <AlertTriangle className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[#5c0c12]">
                    {alert.title}
                  </p>
                  <p className="mt-1 truncate text-[0.65rem] text-[#806f6b]">
                    {alert.detail}
                  </p>
                </div>
                <ArrowRight
                  className="size-4 text-[#921a20]"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="dashboard-card rounded-2xl p-5">
          <SectionTitle action="Agenda futura">Próximas mentorias</SectionTitle>
          <div className="mt-4 divide-y divide-[#ede3dc]">
            {DEMO_DASHBOARD_DATA.mentoring.map((item) => (
              <div
                key={`${item.day}-${item.startup}`}
                className="flex items-center gap-3 py-3"
              >
                <time className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#f8e5df] text-center text-[#751118]">
                  <span className="text-base leading-none font-black">
                    {item.day}
                  </span>
                  <span className="text-[0.55rem] font-black">
                    {item.month}
                  </span>
                </time>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[#4b2929]">
                    {item.startup}
                  </p>
                  <p className="mt-1 truncate text-[0.65rem] text-[#806f6b]">
                    {item.topic}
                  </p>
                </div>
                <span className="rounded-full bg-[#fceaea] px-2.5 py-1 text-[0.62rem] font-black text-[#921a20]">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-card rounded-2xl p-5">
          <SectionTitle action="Plano futuro">
            Plano de ação em destaque
          </SectionTitle>
          <div className="mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-[family-name:var(--font-body)] text-lg font-black text-[#3f090d]">
                  AgroSmart
                </h3>
                <p className="text-xs text-[#806f6b]">
                  Plano Q2/2026 · demonstrativo
                </p>
              </div>
              <span className="rounded-full bg-[#e7f4e8] px-3 py-1 text-[0.62rem] font-black text-[#3d8b51]">
                No prazo
              </span>
            </div>
            <div className="mt-7">
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eee2da]">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#751118] to-[#ad2b2f]" />
              </div>
              <p className="mt-2 text-right text-xs font-black text-[#5c0c12]">
                72%
              </p>
            </div>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-[#eadfd8] text-center">
              <div>
                <dt className="text-2xl font-black text-[#5c0c12]">24</dt>
                <dd className="mt-1 text-[0.6rem] text-[#806f6b]">
                  Ações totais
                </dd>
              </div>
              <div>
                <dt className="text-2xl font-black text-[#5c0c12]">17</dt>
                <dd className="mt-1 text-[0.6rem] text-[#806f6b]">
                  Concluídas
                </dd>
              </div>
              <div>
                <dt className="text-2xl font-black text-[#5c0c12]">7</dt>
                <dd className="mt-1 text-[0.6rem] text-[#806f6b]">
                  Em andamento
                </dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="dashboard-card rounded-2xl p-5">
          <SectionTitle action="Histórico futuro">
            Atividades recentes
          </SectionTitle>
          <div className="mt-4 divide-y divide-[#ede3dc]">
            {DEMO_DASHBOARD_DATA.activities.map((item) => (
              <div key={item.title} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    item.tone === "success"
                      ? "bg-[#e7f4e8] text-[#3d8b51]"
                      : "bg-[#f8e5df] text-[#921a20]",
                  )}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[#4b2929]">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-[0.65rem] text-[#806f6b]">
                    {item.detail}
                  </p>
                </div>
                <time className="text-[0.62rem] text-[#958883]">
                  {item.time}
                </time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-card rounded-2xl p-5">
        <SectionTitle action="Biblioteca futura">
          Conteúdos formativos recomendados
        </SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DEMO_DASHBOARD_DATA.contents.map((content, index) => (
            <article
              key={content.title}
              className="group flex items-center gap-3 rounded-xl border border-[#e9ded6] bg-white/70 p-3 transition hover:-translate-y-0.5 hover:border-[#ad2b2f]/25 hover:shadow-md"
            >
              <div
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-xl",
                  index % 2 === 0
                    ? "bg-[#751118] text-white"
                    : "bg-[#f2dfd0] text-[#5c0c12]",
                )}
              >
                {content.type.startsWith("VÍDEO") ? (
                  <Play className="size-5" aria-hidden="true" />
                ) : (
                  <BookOpen className="size-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[0.55rem] font-black tracking-[0.08em] text-[#8b7c76]">
                  {content.type}
                </p>
                <h3 className="mt-1 line-clamp-2 font-[family-name:var(--font-body)] text-xs leading-5 font-black text-[#4b2929]">
                  {content.title}
                </h3>
                <span className="mt-2 inline-block rounded bg-[#f7ebe4] px-2 py-0.5 text-[0.55rem] font-bold text-[#751118]">
                  {content.tag}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
