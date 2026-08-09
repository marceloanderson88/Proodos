"use server";

import { startupSelfRegistrationSchema } from "@/lib/m6/schemas";
import { registerStartupApplication } from "@/lib/startups/onboarding";

export async function createStartupApplicationAction(
  organizationSlug: string,
  incubatorSlug: string,
  input: unknown,
) {
  const parsed = startupSelfRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Confira os dados informados." };
  }
  try {
    await registerStartupApplication({
      organizationSlug,
      incubatorSlug,
      values: parsed.data,
    });
    return {
      ok: true as const,
      message:
        "Solicitação enviada. Confirme seu e-mail e aguarde a análise da incubadora.",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "STARTUP_APPLICATION_EXISTS") {
      return {
        ok: false as const,
        message: "Já existe uma solicitação pendente para esta conta.",
      };
    }
    if (code === "STARTUP_APPLICATION_ACCOUNT_EXISTS") {
      return {
        ok: false as const,
        message:
          "Este e-mail já possui conta. Entre no Proodos e solicite o vínculo à incubadora.",
      };
    }
    return {
      ok: false as const,
      message: "Não foi possível enviar a solicitação. Tente novamente.",
    };
  }
}
