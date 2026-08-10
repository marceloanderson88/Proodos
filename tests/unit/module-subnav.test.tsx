import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModuleSubnav } from "@/components/layout/module-subnav";

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
  usePathname: () => "/o/proodos/i/sertao-maker/startups",
  useSearchParams: () => new URLSearchParams("view=convites"),
}));

describe("ModuleSubnav", () => {
  it("separa as operações de startups e identifica a visão ativa", () => {
    render(<ModuleSubnav />);

    expect(screen.getByRole("link", { name: /Portfólio/ })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/startups",
    );
    expect(screen.getByRole("link", { name: /Pendentes/ })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/startups?view=pendentes",
    );
    expect(screen.getByRole("link", { name: /Convites/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: /Equipe e turmas/ }),
    ).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/startups?view=vinculos",
    );
    expect(screen.getByRole("link", { name: /Cadastrar/ })).toHaveAttribute(
      "href",
      "/o/proodos/i/sertao-maker/startups/nova",
    );
  });
});
