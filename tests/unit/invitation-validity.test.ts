import { describe, expect, it } from "vitest";

import { invitationExpirationAt } from "@/lib/invitations/validity";

describe("invitationExpirationAt", () => {
  it("mantém convites sem prazo sem data de expiração", () => {
    expect(
      invitationExpirationAt("no_expiry", new Date("2026-01-31T12:00:00Z")),
    ).toBeNull();
  });

  it("soma meses de calendário e ajusta o último dia do mês", () => {
    expect(
      invitationExpirationAt("one_month", new Date("2026-01-31T12:00:00Z")),
    ).toBe("2026-02-28T12:00:00.000Z");
    expect(
      invitationExpirationAt("six_months", new Date("2026-01-31T12:00:00Z")),
    ).toBe("2026-07-31T12:00:00.000Z");
  });

  it("trata um ano como doze meses de calendário", () => {
    expect(
      invitationExpirationAt("one_year", new Date("2024-02-29T12:00:00Z")),
    ).toBe("2025-02-28T12:00:00.000Z");
  });
});
