export const INVITATION_VALIDITIES = [
  "one_month",
  "two_months",
  "three_months",
  "six_months",
  "one_year",
  "no_expiry",
] as const;

export type InvitationValidity = (typeof INVITATION_VALIDITIES)[number];

export const INVITATION_VALIDITY_OPTIONS: ReadonlyArray<{
  value: InvitationValidity;
  label: string;
}> = [
  { value: "one_month", label: "1 mês" },
  { value: "two_months", label: "2 meses" },
  { value: "three_months", label: "3 meses" },
  { value: "six_months", label: "6 meses" },
  { value: "one_year", label: "1 ano" },
  { value: "no_expiry", label: "Sem prazo" },
];

const validityMonths: Record<
  Exclude<InvitationValidity, "no_expiry">,
  number
> = {
  one_month: 1,
  two_months: 2,
  three_months: 3,
  six_months: 6,
  one_year: 12,
};

export function invitationExpirationAt(
  validity: InvitationValidity,
  startsAt = new Date(),
): string | null {
  if (validity === "no_expiry") return null;

  const expiration = new Date(startsAt);
  const originalDay = expiration.getUTCDate();
  expiration.setUTCDate(1);
  expiration.setUTCMonth(expiration.getUTCMonth() + validityMonths[validity]);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth() + 1, 0),
  ).getUTCDate();
  expiration.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return expiration.toISOString();
}
