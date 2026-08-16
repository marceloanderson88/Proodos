import "server-only";

import { getAppBaseUrl, createSupabaseAdminClient } from "@/lib/supabase/admin";

type DispatchOptions = {
  organizationId: string;
  kinds?: string[];
  limit?: number;
};

type DispatchResult = {
  configured: boolean;
  sent: number;
  failed: number;
  pending: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailHtml(text: string, actionUrl: string | null) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;line-height:1.65;color:#3d2929">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("");
  const action = actionUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:12px;background:#8d1018;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">Acessar a plataforma</a></p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;border:1px solid #eaded7;border-radius:18px;background:#fffaf6">${paragraphs}${action}</div>`;
}

export async function dispatchPendingNotifications({
  organizationId,
  kinds,
  limit = 25,
}: DispatchOptions): Promise<DispatchResult> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { configured: false, sent: 0, failed: 0, pending: 0 };
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("notification_outbox")
    .select(
      "id, recipient_email, subject, text_body, action_path, attempts, status",
    )
    .eq("organization_id", organizationId)
    .in("status", ["pending", "failed"])
    .lte("available_at", new Date().toISOString())
    .order("created_at")
    .limit(Math.min(Math.max(limit, 1), 100));
  if (kinds?.length) query = query.in("kind", kinds);
  const { data: notifications, error } = await query;
  if (error)
    throw new Error("NOTIFICATION_OUTBOX_READ_FAILED", { cause: error });

  let sent = 0;
  let failed = 0;
  for (const notification of notifications ?? []) {
    const claimed = await admin
      .from("notification_outbox")
      .update({
        status: "sending",
        attempts: notification.attempts + 1,
        last_error: null,
      })
      .eq("id", notification.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (claimed.error || !claimed.data) continue;

    try {
      const actionUrl = notification.action_path
        ? new URL(notification.action_path, getAppBaseUrl()).toString()
        : null;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [notification.recipient_email],
          subject: notification.subject,
          text: `${notification.text_body}${actionUrl ? `\n\n${actionUrl}` : ""}`,
          html: emailHtml(notification.text_body, actionUrl),
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 800);
        throw new Error(`EMAIL_PROVIDER_${response.status}: ${detail}`);
      }
      await admin
        .from("notification_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", notification.id);
      sent += 1;
    } catch (dispatchError) {
      const attempts = notification.attempts + 1;
      const retryAt = new Date(
        Date.now() + Math.min(60, 2 ** Math.min(attempts, 5)) * 60_000,
      ).toISOString();
      await admin
        .from("notification_outbox")
        .update({
          status: "failed",
          available_at: retryAt,
          last_error:
            dispatchError instanceof Error
              ? dispatchError.message.slice(0, 1000)
              : "Falha desconhecida no provedor de e-mail",
        })
        .eq("id", notification.id);
      failed += 1;
    }
  }

  return {
    configured: true,
    sent,
    failed,
    pending: Math.max(0, (notifications?.length ?? 0) - sent - failed),
  };
}
