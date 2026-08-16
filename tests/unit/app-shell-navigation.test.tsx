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

  it("organiza os módulos em grupos com links diretos", () => {
    render(<AppShell {...props}>Conteúdo</AppShell>);

    expect(screen.getByRole("heading", { name: "Principal" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Operação" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Gestão" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sistema" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Seleção" })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/chamadas",
    );
    expect(screen.getByRole("link", { name: "Portfólio" })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/programas",
    );
  });

  it("oferece acesso direto ao CERNE e às configurações", () => {
    render(<AppShell {...props}>Conteúdo</AppShell>);

    expect(screen.getByRole("link", { name: "CERNE" })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/cerne",
    );
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/gestao-incubadora",
    );
  });

  it("abre os submenus sem impedir o acesso à visão geral do módulo", async () => {
    const user = userEvent.setup();
    render(<AppShell {...props}>Conteúdo</AppShell>);

    const selection = screen.getByRole("link", { name: "Seleção" });
    expect(selection).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/chamadas",
    );

    const toggle = screen.getByRole("button", {
      name: "Abrir submenu de Seleção",
    });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Inscrições" })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/chamadas?view=applications",
    );
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
