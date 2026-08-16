import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { getIncubatorServerContext } from "@/lib/incubators/server-context";
import {
  invitationExpirationAt,
  type InvitationValidity,
} from "@/lib/invitations/validity";
import { createSupabaseAdminClient, getAppBaseUrl } from "@/lib/supabase/admin";

type IncubatorContext = Awaited<ReturnType<typeof getIncubatorServerContext>>;

export type IncubatorInvitationInput = {
  invitedName: string;
  email: string;
  roleId: string;
  validity: InvitationValidity;
};

export async function sendIncubatorInvitation(
  context: IncubatorContext,
  input: IncubatorInvitationInput,
) {
  const admin = createSupabaseAdminClient();
  const baseUrl = getAppBaseUrl();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = invitationExpirationAt(input.validity);

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

  return { invitationId: inserted.data.id, expiresAt };
}
