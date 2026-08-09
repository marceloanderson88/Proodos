type DimensionChartPoint = {
  id: string;
  code: string | null;
  name: string;
  selfScore: number | null;
  validatedScore: number | null;
};

type EvolutionCycle = {
  id: string;
  label: string;
  selfScore: number | null;
  validatedScore: number | null;
};

const clampScore = (value: number | null) =>
  value == null ? null : Math.max(0, Math.min(100, value));

function polygonPoints(values: number[], center: number, radius: number) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      const distance = (radius * value) / 100;
      return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
    })
    .join(" ");
}

export function DiagnosticRadarChart({
  dimensions,
}: {
  dimensions: DimensionChartPoint[];
}) {
  if (dimensions.length < 3) return null;
  const center = 170;
  const radius = 112;
  const selfValues = dimensions.map((item) => clampScore(item.selfScore) ?? 0);
  const validatedValues = dimensions.map(
    (item) => clampScore(item.validatedScore) ?? 0,
  );
  const hasCompleteSelfSeries = dimensions.every(
    (item) => item.selfScore != null,
  );
  const hasCompleteValidatedSeries = dimensions.every(
    (item) => item.validatedScore != null,
  );

  return (
    <figure className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
      <figcaption>
        <p className="text-[0.64rem] font-black tracking-[0.14em] text-[#9a2930] uppercase">
          Visão integrada
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#481014]">
          Radar de maturidade
        </h2>
      </figcaption>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[#6d5b57]">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#8b161d]" /> Declarado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#5b9468]" /> Validado
        </span>
      </div>
      <svg
        viewBox="0 0 340 340"
        className="mx-auto mt-2 block aspect-square w-full max-w-[25rem]"
        role="img"
        aria-labelledby="diagnostic-radar-title diagnostic-radar-description"
      >
        <title id="diagnostic-radar-title">Comparativo de maturidade</title>
        <desc id="diagnostic-radar-description">
          Pontuações declaradas e validadas, de zero a cem, por dimensão do
          diagnóstico.
        </desc>
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={polygonPoints(
              dimensions.map(() => ring),
              center,
              radius,
            )}
            fill={ring === 100 ? "#fffaf6" : "none"}
            stroke="#decfc8"
            strokeWidth="1"
          />
        ))}
        {dimensions.map((dimension, index) => {
          const angle =
            -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
          const axisX = center + Math.cos(angle) * radius;
          const axisY = center + Math.sin(angle) * radius;
          const labelX = center + Math.cos(angle) * (radius + 24);
          const labelY = center + Math.sin(angle) * (radius + 24);
          return (
            <g key={dimension.id}>
              <line
                x1={center}
                y1={center}
                x2={axisX}
                y2={axisY}
                stroke="#e4d8d1"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={
                  Math.cos(angle) > 0.25
                    ? "start"
                    : Math.cos(angle) < -0.25
                      ? "end"
                      : "middle"
                }
                dominantBaseline="middle"
                className="fill-[#6f5d59] text-[9px] font-black"
              >
                {dimension.code ?? `D${index + 1}`}
                <title>{dimension.name}</title>
              </text>
            </g>
          );
        })}
        {hasCompleteSelfSeries ? (
          <polygon
            points={polygonPoints(selfValues, center, radius)}
            fill="#8b161d"
            fillOpacity="0.14"
            stroke="#8b161d"
            strokeWidth="2.5"
          />
        ) : null}
        {hasCompleteValidatedSeries ? (
          <polygon
            points={polygonPoints(validatedValues, center, radius)}
            fill="#5b9468"
            fillOpacity="0.14"
            stroke="#5b9468"
            strokeWidth="2.5"
          />
        ) : null}
        {dimensions.map((dimension, index) => {
          const angle =
            -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
          return [
            ["self", clampScore(dimension.selfScore), "#8b161d"],
            ["validated", clampScore(dimension.validatedScore), "#5b9468"],
          ].map(([kind, rawValue, color]) => {
            if (typeof rawValue !== "number") return null;
            const value = rawValue;
            const distance = (radius * value) / 100;
            return (
              <circle
                key={`${dimension.id}-${kind}`}
                cx={center + Math.cos(angle) * distance}
                cy={center + Math.sin(angle) * distance}
                r="3.5"
                fill={String(color)}
              />
            );
          });
        })}
      </svg>
      {!hasCompleteSelfSeries || !hasCompleteValidatedSeries ? (
        <p className="rounded-xl bg-[#fff4de] px-4 py-3 text-xs leading-5 text-[#70440d]">
          Séries incompletas não são fechadas no radar. Consulte as barras e os
          dados textuais para os valores já disponíveis.
        </p>
      ) : null}
      <details className="mt-2 rounded-xl bg-[#fbf6f2] px-4 py-3 text-xs text-[#6d5b57]">
        <summary className="cursor-pointer font-black text-[#751118]">
          Ver dados do gráfico
        </summary>
        <ul className="mt-3 space-y-2">
          {dimensions.map((dimension) => (
            <li key={dimension.id} className="flex justify-between gap-4">
              <span>{dimension.name}</span>
              <span className="shrink-0 font-bold">
                {dimension.selfScore ?? "—"} / {dimension.validatedScore ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </figure>
  );
}

export function DiagnosticDimensionBarChart({
  dimensions,
}: {
  dimensions: DimensionChartPoint[];
}) {
  return (
    <figure className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
      <figcaption className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.64rem] font-black tracking-[0.14em] text-[#9a2930] uppercase">
            Comparativo por dimensão
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#481014]">
            Declarado × validado
          </h2>
        </div>
        <span className="text-xs font-bold text-[#806f6b]">0–100</span>
      </figcaption>
      <div className="mt-6 space-y-5">
        {dimensions.map((dimension) => (
          <div key={dimension.id}>
            <div className="mb-2 flex items-end justify-between gap-4 text-sm">
              <span className="truncate font-black text-[#4b1719]">
                {dimension.code} · {dimension.name}
              </span>
              <span className="shrink-0 text-xs font-bold text-[#806f6b]">
                {dimension.selfScore ?? "—"} / {dimension.validatedScore ?? "—"}
              </span>
            </div>
            <div
              className="grid grid-cols-2 gap-1.5"
              aria-label={`${dimension.name}: declarado ${dimension.selfScore ?? "sem valor"}, validado ${dimension.validatedScore ?? "sem valor"}`}
            >
              <div className="h-3 overflow-hidden rounded-full bg-[#f0e5df]">
                <div
                  className="h-full rounded-full bg-[#8b161d]"
                  style={{ width: `${clampScore(dimension.selfScore) ?? 0}%` }}
                />
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#e6eee8]">
                <div
                  className="h-full rounded-full bg-[#5b9468]"
                  style={{
                    width: `${clampScore(dimension.validatedScore) ?? 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {dimensions.length === 0 ? (
        <p className="mt-6 rounded-xl bg-[#faf5f1] p-5 text-sm text-[#806f6b]">
          Os scores por dimensão aparecerão após as primeiras respostas.
        </p>
      ) : null}
    </figure>
  );
}

function linePath(values: Array<number | null>, width: number, height: number) {
  const usableWidth = width - 48;
  const usableHeight = height - 52;
  const denominator = Math.max(1, values.length - 1);
  let startsSegment = true;
  return values
    .flatMap((rawValue, index) => {
      const value = clampScore(rawValue);
      if (value == null) {
        startsSegment = true;
        return [];
      }
      const x = 34 + (index * usableWidth) / denominator;
      const y = 18 + usableHeight - (value * usableHeight) / 100;
      const command = `${startsSegment ? "M" : "L"}${x} ${y}`;
      startsSegment = false;
      return [command];
    })
    .join(" ");
}

export function DiagnosticEvolutionChart({
  cycles,
}: {
  cycles: EvolutionCycle[];
}) {
  if (cycles.length < 2) return null;
  const width = 720;
  const height = 270;
  const selfValues = cycles.map((cycle) => cycle.selfScore);
  const validatedValues = cycles.map((cycle) => cycle.validatedScore);

  return (
    <figure className="dashboard-card rounded-[1.6rem] p-5 sm:p-6">
      <figcaption>
        <p className="text-[0.64rem] font-black tracking-[0.14em] text-[#9a2930] uppercase">
          Série temporal
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#481014]">
          Evolução dos scores
        </h2>
      </figcaption>
      <div className="mt-3 flex gap-4 text-xs font-bold text-[#6d5b57]">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-[#8b161d]" /> Declarado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-[#5b9468]" /> Validado
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[38rem]"
          role="img"
          aria-labelledby="diagnostic-evolution-title diagnostic-evolution-description"
        >
          <title id="diagnostic-evolution-title">Evolução do diagnóstico</title>
          <desc id="diagnostic-evolution-description">
            Linha temporal das pontuações declaradas e validadas em cada ciclo.
          </desc>
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = 18 + (100 - tick) * ((height - 52) / 100);
            return (
              <g key={tick}>
                <line x1="34" y1={y} x2={width - 14} y2={y} stroke="#eadfd8" />
                <text
                  x="25"
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#8b7773] text-[9px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          <path
            d={linePath(selfValues, width, height)}
            fill="none"
            stroke="#8b161d"
            strokeWidth="3"
          />
          <path
            d={linePath(validatedValues, width, height)}
            fill="none"
            stroke="#5b9468"
            strokeWidth="3"
          />
          {cycles.map((cycle, index) => {
            const x =
              34 + (index * (width - 48)) / Math.max(1, cycles.length - 1);
            return (
              <g key={cycle.id}>
                {[
                  [cycle.selfScore, "#8b161d"],
                  [cycle.validatedScore, "#5b9468"],
                ].map(([rawValue, color], pointIndex) => {
                  if (typeof rawValue !== "number") return null;
                  const value = clampScore(rawValue)!;
                  const y = 18 + (height - 52) - (value * (height - 52)) / 100;
                  return (
                    <circle
                      key={pointIndex}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={String(color)}
                    />
                  );
                })}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-[#6f5d59] text-[9px] font-bold"
                >
                  {cycle.label.length > 14
                    ? `${cycle.label.slice(0, 13)}…`
                    : cycle.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <details className="mt-3 rounded-xl bg-[#fbf6f2] px-4 py-3 text-xs text-[#6d5b57]">
        <summary className="cursor-pointer font-black text-[#751118]">
          Ver série numérica
        </summary>
        <ul className="mt-3 space-y-2">
          {cycles.map((cycle) => (
            <li key={cycle.id} className="flex justify-between gap-4">
              <span>{cycle.label}</span>
              <span className="shrink-0 font-bold">
                {cycle.selfScore ?? "—"} / {cycle.validatedScore ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </figure>
  );
}
