import { describe, expect, it } from "vitest";

import {
  createRequestId,
  isTrustedMutationRequest,
} from "@/lib/security/request";

describe("request security", () => {
  it("aceita somente a mesma origem para mutações por cookie", () => {
    const trusted = new Request("https://proodos.vercel.app/api/action", {
      headers: { origin: "https://proodos.vercel.app" },
    });
    const untrusted = new Request("https://proodos.vercel.app/api/action", {
      headers: { origin: "https://attacker.invalid" },
    });
    expect(isTrustedMutationRequest(trusted)).toBe(true);
    expect(isTrustedMutationRequest(untrusted)).toBe(false);
  });

  it("não confia em request id malformado", () => {
    expect(createRequestId("id válido")).not.toBe("id válido");
    expect(createRequestId("gru1::abc-123")).toBe("gru1::abc-123");
  });
});
