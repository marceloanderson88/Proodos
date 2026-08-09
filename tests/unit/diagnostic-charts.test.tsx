import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DiagnosticDimensionBarChart,
  DiagnosticEvolutionChart,
  DiagnosticRadarChart,
} from "@/components/diagnostics/diagnostic-charts";

const dimensions = [
  {
    id: "d1",
    code: "D1",
    name: "Estratégia",
    selfScore: 75,
    validatedScore: 62,
  },
  {
    id: "d2",
    code: "D2",
    name: "Mercado",
    selfScore: 60,
    validatedScore: 55,
  },
  {
    id: "d3",
    code: "D3",
    name: "Operações",
    selfScore: 45,
    validatedScore: 51,
  },
];

describe("gráficos de diagnóstico", () => {
  it("expõe o radar e seus valores também em formato textual", () => {
    render(<DiagnosticRadarChart dimensions={dimensions} />);

    expect(
      screen.getByRole("img", { name: /Comparativo de maturidade/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Estratégia")).toHaveLength(2);
    expect(screen.getByText("75 / 62")).toBeInTheDocument();
  });

  it("descreve as barras por dimensão para tecnologia assistiva", () => {
    render(<DiagnosticDimensionBarChart dimensions={dimensions} />);

    expect(
      screen.getByLabelText("Mercado: declarado 60, validado 55"),
    ).toBeInTheDocument();
  });

  it("renderiza evolução somente quando há pelo menos dois ciclos", () => {
    const { rerender } = render(
      <DiagnosticEvolutionChart
        cycles={[
          {
            id: "t0",
            label: "T0",
            selfScore: 40,
            validatedScore: 35,
          },
        ]}
      />,
    );
    expect(
      screen.queryByRole("img", { name: "Evolução do diagnóstico" }),
    ).not.toBeInTheDocument();

    rerender(
      <DiagnosticEvolutionChart
        cycles={[
          {
            id: "t0",
            label: "T0",
            selfScore: 40,
            validatedScore: 35,
          },
          {
            id: "t1",
            label: "T1",
            selfScore: 68,
            validatedScore: 62,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("img", { name: /Evolução do diagnóstico/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("68 / 62")).toBeInTheDocument();
  });
});
