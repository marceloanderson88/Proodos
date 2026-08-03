"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import {
  invitationLifecycleSchema,
  inviteIncubatorPersonSchema,
  updateIncubatorOperationsSchema,
} from "@/lib/incubators/schemas";
import {
  manageIncubatorPersonRoleSchema,
  removeIncubatorPersonRoleSchema,
} from "@/lib/m6/schemas";
import { createSupabaseAdminClient, getAppBaseUrl } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function feedbackUrl(
  organizationSlug: string,
  incubatorSlug: string,
  kind: "success" | "error",
  message: string,
) {
  return `/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora?${kind}=${encodeURIComponent(message)}`;
}

function revalidateManagement(organizationSlug: string, incubatorSlug: string) {
  revalidatePath(`/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora`);
  revalidatePath("/o");
}

const imageExtensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function updateIncubatorOperationsAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateIncubatorOperationsSchema.safeParse({
    name: value(formData, "name"),
    kind: value(formData, "kind"),
    customKind: value(formData, "customKind"),
    legalName: value(formData, "legalName"),
    description: value(formData, "description"),
    contactEmail: value(formData, "contactEmail"),
    phone: value(formData, "phone"),
    website: value(formData, "website"),
    city: value(formData, "city"),
    state: value(formData, "state"),
    countryCode: value(formData, "countryCode") || "BR",
    responsibleName: value(formData, "responsibleName"),
    timezone: value(formData, "timezone"),
    locale: value(formData, "locale"),
    diagnosticsEnabled: formData.get("diagnosticsEnabled") === "on",
    actionPlansEnabled: formData.get("actionPlansEnabled") === "on",
    mentoringEnabled: formData.get("mentoringEnabled") === "on",
    learningTrailsEnabled: formData.get("learningTrailsEnabled") === "on",
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Configurações inválidas.",
      ),
    );
  }

  const current = await context.supabase
    .from("incubators")
    .select("settings, logo_path")
    .eq("organization_id", context.organization.id)
    .eq("id", context.incubator.id)
    .single();
  if (current.error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível consultar a incubadora.",
      ),
    );

  const previous =
    current.data.settings &&
    typeof current.data.settings === "object" &&
    !Array.isArray(current.data.settings)
      ? current.data.settings
      : {};
  const settings: Json = {
    ...previous,
    resources: {
      diagnostics: parsed.data.diagnosticsEnabled,
      actionPlans: parsed.data.actionPlansEnabled,
      mentoring: parsed.data.mentoringEnabled,
      learningTrails: parsed.data.learningTrailsEnabled,
    },
  };

  const uploadedFile = formData.get("logo");
  const removeLogo = formData.get("removeLogo") === "on";
  let nextLogoPath = removeLogo ? null : current.data.logo_path;
  let uploadedPath: string | null = null;
  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const extension = imageExtensions[uploadedFile.type];
    if (!extension || uploadedFile.size > 2 * 1024 * 1024) {
      redirect(
        feedbackUrl(
          organizationSlug,
          incubatorSlug,
          "error",
          "A logo deve ser PNG, JPG ou WebP e ter até 2 MB.",
        ),
      );
    }
    uploadedPath = `${context.organization.id}/${context.incubator.id}/logo-${randomUUID()}.${extension}`;
    const upload = await context.supabase.storage
      .from("incubator-logos")
      .upload(uploadedPath, new Uint8Array(await uploadedFile.arrayBuffer()), {
        contentType: uploadedFile.type,
        upsert: false,
      });
    if (upload.error)
      redirect(
        feedbackUrl(
          organizationSlug,
          incubatorSlug,
          "error",
          "Não foi possível enviar a nova logo.",
        ),
      );
    nextLogoPath = uploadedPath;
  }

  const { count: assignedPeople } = await context.supabase
    .from("role_assignments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id);

  const { error } = await context.supabase
    .from("incubators")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      custom_kind: parsed.data.customKind,
      legal_name: parsed.data.legalName,
      short_description: parsed.data.description,
      logo_path: nextLogoPath,
      contact_email: parsed.data.contactEmail,
      phone: parsed.data.phone,
      website_url: parsed.data.website,
      city: parsed.data.city,
      state: parsed.data.state,
      country_code: parsed.data.countryCode,
      responsible_name: parsed.data.responsibleName,
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
      settings,
      onboarding_completed_at:
        (assignedPeople ?? 0) > 0 ? new Date().toISOString() : null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", context.incubator.id);
  if (error) {
    if (uploadedPath)
      await context.supabase.storage
        .from("incubator-logos")
        .remove([uploadedPath]);
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Você não tem permissão ou a configuração é inválida.",
      ),
    );
  }

  if (current.data.logo_path && current.data.logo_path !== nextLogoPath) {
    await context.supabase.storage
      .from("incubator-logos")
      .remove([current.data.logo_path]);
  }
  revalidateManagement(organizationSlug, incubatorSlug);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Perfil e módulos da incubadora atualizados.",
    ),
  );
}

async function sendInvitation(
  context: Awaited<ReturnType<typeof getIncubatorServerContext>>,
  input: {
    invitedName: string;
    email: string;
    roleId: string;
    expiresInDays: number;
  },
) {
  const admin = createSupabaseAdminClient();
  const baseUrl = getAppBaseUrl();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(
    Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const inserted = await context.supabase
    .from("invitations")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      unit_id: null,
      invited_name: input.invitedName,
      email: input.email,
      role_id: input.roleId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: context.user.id,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data)
    throw inserted.error ?? new Error("INVITATION_INSERT_FAILED");

  const acceptancePath = `/convites/aceitar?token=${encodeURIComponent(rawToken)}`;
  const callback = new URL("/auth/callback", baseUrl);
  callback.searchParams.set("next", acceptancePath);
  const invited = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { display_name: input.invitedName },
    redirectTo: callback.toString(),
  });

  if (invited.error) {
    const fallback = await context.supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: callback.toString(),
      },
    });
    if (fallback.error) {
      await context.supabase
        .from("invitations")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", inserted.data.id);
      throw invited.error;
    }
  }
}

export async function inviteIncubatorPersonAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = inviteIncubatorPersonSchema.safeParse({
    invitedName: value(formData, "invitedName"),
    email: value(formData, "email"),
    roleId: value(formData, "roleId"),
    expiresInDays: value(formData, "expiresInDays") || "7",
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Convite inválido.",
      ),
    );

  try {
    await sendInvitation(context, parsed.data);
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message === "SUPABASE_SECRET_KEY_NOT_CONFIGURED"
        ? "Configure SUPABASE_SECRET_KEY na Vercel para enviar convites."
        : "Não foi possível enviar o convite. Verifique se já existe um convite pendente para esse e-mail.";
    redirect(feedbackUrl(organizationSlug, incubatorSlug, "error", message));
  }
  revalidateManagement(organizationSlug, incubatorSlug);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      `Convite enviado para ${parsed.data.email}.`,
    ),
  );
}

export async function manageInvitationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = invitationLifecycleSchema.safeParse({
    invitationId: value(formData, "invitationId"),
    action: value(formData, "action"),
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Convite inválido.",
      ),
    );

  const invitation = await context.supabase
    .from("invitations")
    .select("id, invited_name, email, role_id, expires_at, status")
    .eq("id", parsed.data.invitationId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .maybeSingle();
  if (
    invitation.error ||
    !invitation.data ||
    invitation.data.status !== "pending"
  )
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "O convite não está mais pendente.",
      ),
    );

  const revoked = await context.supabase
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", invitation.data.id)
    .eq("status", "pending");
  if (revoked.error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível atualizar o convite.",
      ),
    );

  if (parsed.data.action === "resend") {
    try {
      await sendInvitation(context, {
        invitedName:
          invitation.data.invited_name ??
          invitation.data.email.split("@")[0] ??
          invitation.data.email,
        email: invitation.data.email,
        roleId: invitation.data.role_id,
        expiresInDays: 7,
      });
    } catch {
      redirect(
        feedbackUrl(
          organizationSlug,
          incubatorSlug,
          "error",
          "O convite anterior foi revogado, mas o reenvio falhou.",
        ),
      );
    }
  }
  revalidateManagement(organizationSlug, incubatorSlug);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      parsed.data.action === "resend"
        ? "Novo convite enviado."
        : "Convite revogado.",
    ),
  );
}

export async function assignIncubatorPersonRoleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = manageIncubatorPersonRoleSchema.safeParse({
    membershipId: value(formData, "membershipId"),
    roleId: value(formData, "roleId"),
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Selecione uma pessoa e um papel.",
      ),
    );
  const { error } = await context.supabase.from("role_assignments").insert({
    organization_id: context.organization.id,
    membership_id: parsed.data.membershipId,
    role_id: parsed.data.roleId,
    incubator_id: context.incubator.id,
    unit_id: null,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        error.code === "23505"
          ? "Essa pessoa já possui o papel selecionado."
          : "Não foi possível atribuir o papel.",
      ),
    );
  revalidateManagement(organizationSlug, incubatorSlug);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Papel atribuído à pessoa.",
    ),
  );
}

export async function removeIncubatorPersonRoleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = removeIncubatorPersonRoleSchema.safeParse({
    assignmentId: value(formData, "assignmentId"),
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Atribuição inválida.",
      ),
    );
  const { error } = await context.supabase
    .from("role_assignments")
    .delete()
    .eq("id", parsed.data.assignmentId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id);
  if (error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível remover o papel.",
      ),
    );
  revalidateManagement(organizationSlug, incubatorSlug);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Papel removido da pessoa.",
    ),
  );
}
