import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorReference } from "@/components/error-reference";

describe("ErrorReference", () => {
  it("não renderiza identificador quando a plataforma não o forneceu", () => {
    const { container } = render(<ErrorReference />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exibe somente a referência segura para suporte", () => {
    render(<ErrorReference reference="route-digest-123" />);
    expect(screen.getByText("route-digest-123")).toBeInTheDocument();
    expect(screen.getByText(/Referência para suporte/)).toBeInTheDocument();
  });
});
