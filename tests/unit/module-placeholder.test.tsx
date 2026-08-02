import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModulePlaceholder } from "@/components/module-placeholder";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("ModulePlaceholder", () => {
  it("não simula persistência silenciosamente", () => {
    render(
      <ModulePlaceholder
        title="Startups"
        description="Módulo futuro."
        organizationSlug="sertao-maker"
      />,
    );
    expect(
      screen.getByText("Shell preparado · sem persistência"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Voltar ao dashboard/ }),
    ).toHaveAttribute("href", "/o/sertao-maker/dashboard");
  });
});
