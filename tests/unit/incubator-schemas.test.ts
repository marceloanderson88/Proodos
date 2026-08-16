import { describe, expect, it } from "vitest";

import {
  createIncubatorSchema,
  incubatorLifecycleSchema,
  inviteIncubatorPersonSchema,
  slugifyIncubatorName,
} from "@/lib/incubators/schemas";

const validIncubator = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  name: "  Incubadora Sertão Maker  ",
  kind: "incubator" as const,
  customKind: "",
  legalName: "",
  shortDescription:
    "Apoia negócios inovadores do sertão desde a validação até a operação.",
  contactEmail: "contato@example.com",
  phone: "",
  websiteUrl: "",
  city: "Salgueiro",
  state: "Pernambuco",
  countryCode: "BR",
  responsibleName: "Marcelo Silva",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
};

describe("incubator schemas", () => {
  it("normaliza o nome e gera slug sem exigir identificador manual", () => {
    const parsed = createIncubatorSchema.parse(validIncubator);
    expect(parsed.name).toBe("Incubadora Sertão Maker");
    expect(slugifyIncubatorName(parsed.name)).toBe("incubadora-sertao-maker");
  });

  it("exige nome do tipo quando a operação usa a opção outro", () => {
    expect(
      createIncubatorSchema.safeParse({
        ...validIncubator,
        kind: "other",
        customKind: "",
      }).success,
    ).toBe(false);
  });

  it("valida o convite que antecede a atribuição de papel", () => {
    const parsed = inviteIncubatorPersonSchema.parse({
      invitedName: "Pessoa Gestora",
      email: "GESTORA@EXAMPLE.COM",
      roleId: "20000000-0000-4000-8000-000000000001",
      validity: "no_expiry",
    });

    expect(parsed.email).toBe("gestora@example.com");
    expect(parsed.validity).toBe("no_expiry");
  });

  it("aceita somente ações de ciclo de vida previstas", () => {
    const id = "20000000-0000-4000-8000-000000000001";
    expect(
      incubatorLifecycleSchema.safeParse({ incubatorId: id, action: "archive" })
        .success,
    ).toBe(true);
    expect(
      incubatorLifecycleSchema.safeParse({ incubatorId: id, action: "purge" })
        .success,
    ).toBe(false);
  });
});
