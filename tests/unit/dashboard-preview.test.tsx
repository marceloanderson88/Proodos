import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardPreview } from "@/components/dashboard/dashboard-preview";

describe("DashboardPreview", () => {
  it("identifica os dados como demonstrativos", () => {
    render(<DashboardPreview />);
    expect(screen.getByText("Dados demonstrativos")).toBeInTheDocument();
    expect(
      screen.getByText(/Todos os nomes, números e atividades/),
    ).toBeInTheDocument();
  });

  it("expõe o gráfico com descrição acessível", () => {
    render(<DashboardPreview />);
    expect(
      screen.getByRole("img", {
        name: /Evolução demonstrativa de startups ativas/,
      }),
    ).toBeInTheDocument();
  });
});
