import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env";
import type { getIncubatorServerContext } from "@/lib/incubators/server-context";
import {
  inviteStartupSchema,
  startupSelfRegistrationSchema,
  type StartupSelfRegistrationInput,
} from "@/lib/m6/schemas";
import { createSupabaseAdminClient, getAppBaseUrl } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type IncubatorContext = Awaited<ReturnType<typeof getIncubatorServerContext>>;

export async function registerStartupApplication(input: {
  organizationSlug: string;
  incubatorSlug: string;
  values: StartupSelfRegistrationInput;
}) {
  const parsed = startupSelfRegistrationSchema.parse(input.values);
  const env = getSupabasePublicEnv();
  const auth = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const callback = new URL("/auth/callback", getAppBaseUrl());
  callback.searchParams.set("next", "/o");
  const { data, error } = await auth.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: callback.toString(),
      data: { display_name: parsed.applicantName },
    },
  });
  if (error || !data.user) throw new Error("STARTUP_APPLICATION_SIGNUP_FAILED");
  if (data.user.identities?.length === 0)
    throw new Error("STARTUP_APPLICATION_ACCOUNT_EXISTS");

  try {
    await persistStartupApplication({
      organizationSlug: input.organizationSlug,
      incubatorSlug: input.incubatorSlug,
      userId: data.user.id,
      values: parsed,
    });
  } catch (applicationError) {
    await createSupabaseAdminClient().auth.admin.deleteUser(data.user.id);
    throw applicationError;
  }
}

export async function persistStartupApplication(input: {
  organizationSlug: string;
  incubatorSlug: string;
  userId: string;
  values: StartupSelfRegistrationInput;
}) {
  const parsed = startupSelfRegistrationSchema.parse(input.values);
  const admin = createSupabaseAdminClient();
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(input.userId);
  const registeredEmail = userData.user?.email?.trim().toLowerCase();
  if (userError || !userData.user || registeredEmail !== parsed.email) {
    throw new Error("STARTUP_APPLICATION_IDENTITY_INVALID");
  }

  const { data: organization } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", input.organizationSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!organization) throw new Error("STARTUP_APPLICATION_CONTEXT_INVALID");

  const { data: incubator } = await admin
    .from("incubators")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("slug", input.incubatorSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!incubator) throw new Error("STARTUP_APPLICATION_CONTEXT_INVALID");

  if (parsed.cohortId) {
    const { data: cohort } = await admin
      .from("cohorts")
      .select("programs!inner(incubator_id)")
      .eq("organization_id", organization.id)
      .eq("id", parsed.cohortId)
      .eq("programs.incubator_id", incubator.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!cohort) throw new Error("STARTUP_APPLICATION_COHORT_INVALID");
  }

  const { error } = await admin.from("startup_applications").insert({
    organization_id: organization.id,
    incubator_id: incubator.id,
    applicant_user_id: userData.user.id,
    applicant_name: parsed.applicantName,
    applicant_email: parsed.email,
    startup_name: parsed.name,
    legal_name: parsed.legalName,
    tax_id: parsed.taxId,
    sector: parsed.sector,
    business_model: parsed.businessModel,
    stage: parsed.stage,
    city: parsed.city,
    state: parsed.state,
    website_url: parsed.websiteUrl,
    cohort_id: parsed.cohortId,
  });
  if (error) {
    if (error.code === "23505") throw new Error("STARTUP_APPLICATION_EXISTS");
    throw error;
  }
}

export async function sendStartupOnboardingInvitation(
  context: IncubatorContext,
  rawInput: {
    startupId: string | null;
    startupName: string;
    representativeName: string;
    email: string;
    cohortId: string | null;
  },
) {
  const input = inviteStartupSchema.parse({
    startupId: rawInput.startupId ?? "",
    startupName: rawInput.startupName,
    representativeName: rawInput.representativeName,
    email: rawInput.email,
    cohortId: rawInput.cohortId ?? "",
  });
  if (input.startupId) {
    const existingInvitations = await context.supabase
      .from("invitations")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("incubator_id", context.incubator.id)
      .eq("email", input.email)
      .in("status", ["pending", "accepted"]);
    const invitationIds = (existingInvitations.data ?? []).map(
      (invitation) => invitation.id,
    );
    if (invitationIds.length > 0) {
      const existingMapping = await context.supabase
        .from("startup_onboarding_invitations")
        .select("invitation_id")
        .eq("organization_id", context.organization.id)
        .eq("startup_id", input.startupId)
        .in("invitation_id", invitationIds)
        .limit(1)
        .maybeSingle();
      if (existingMapping.data) return existingMapping.data.invitation_id;
    }
  }
  const { data: role } = await context.supabase
    .from("roles")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("code", "startup_representative")
    .maybeSingle();
  if (!role) throw new Error("STARTUP_REPRESENTATIVE_ROLE_MISSING");

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const inserted = await context.supabase
    .from("invitations")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      unit_id: null,
      invited_name: input.representativeName,
      email: input.email,
      role_id: role.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: context.user.id,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) throw inserted.error;

  const mapped = await context.supabase
    .from("startup_onboarding_invitations")
    .insert({
      invitation_id: inserted.data.id,
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      startup_id: input.startupId,
      startup_name: input.startupName,
      cohort_id: input.cohortId,
      created_by: context.user.id,
    });
  if (mapped.error) {
    await context.supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", inserted.data.id);
    throw mapped.error;
  }

  const baseUrl = getAppBaseUrl();
  const acceptancePath = `/convites/aceitar?token=${encodeURIComponent(rawToken)}`;
  const callback = new URL("/auth/callback", baseUrl);
  callback.searchParams.set("next", acceptancePath);
  const admin = createSupabaseAdminClient();
  const invited = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { display_name: input.representativeName },
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
  return inserted.data.id;
}
