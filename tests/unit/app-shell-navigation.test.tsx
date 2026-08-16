import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/proodos/i/sertao-maker/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/brand-mark", () => ({
  BrandMark: () => <div>Proodos</div>,
}));

describe("AppShell navigation", () => {
  const props = {
    organization: { id: "org-1", name: "Proodos", slug: "proodos" },
    currentIncubator: {
      id: "inc-1",
      name: "Sertão Maker",
      slug: "sertao-maker",
    },
    incubators: [{ id: "inc-1", name: "Sertão Maker", slug: "sertao-maker" }],
    user: {
      id: "user-1",
      displayName: "Marcelo Santos",
      email: "marcelo@example.com",
      avatarUrl: null,
    },
  };

  it("mantém apenas um grupo principal expandido por vez", async () => {
    const user = userEvent.setup();
    render(<AppShell {...props}>Conteúdo</AppShell>);

    const portfolio = screen.getByRole("button", { name: "Portfólio" });
    const development = screen.getByRole("button", {
      name: "Desenvolvimento",
    });

    expect(portfolio).toHaveAttribute("aria-expanded", "false");
    expect(development).toHaveAttribute("aria-expanded", "false");

    await user.click(portfolio);
    expect(portfolio).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Programas e turmas")).toBeVisible();

    await user.click(development);
    expect(portfolio).toHaveAttribute("aria-expanded", "false");
    expect(development).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Diagnósticos" })).toBeVisible();
  });

  it("recolhe e reabre o menu lateral no desktop", async () => {
    const user = userEvent.setup();
    render(<AppShell {...props}>Conteúdo</AppShell>);

    const hideButton = screen.getByRole("button", {
      name: "Esconder menu lateral",
    });
    expect(hideButton).toHaveAttribute("aria-expanded", "true");

    await user.click(hideButton);

    const showButton = screen.getByRole("button", {
      name: "Mostrar menu lateral",
    });
    expect(showButton).toHaveAttribute("aria-expanded", "false");

    await user.click(showButton);
    expect(
      screen.getByRole("button", { name: "Esconder menu lateral" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
