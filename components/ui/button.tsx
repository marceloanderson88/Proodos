import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--wine-800)] text-white shadow-[0_10px_24px_rgb(117_17_24/18%)] hover:-translate-y-0.5 hover:bg-[var(--wine-700)]",
  secondary:
    "border border-[var(--border)] bg-white text-[var(--wine-800)] hover:bg-[var(--surface-muted)]",
  ghost:
    "text-[var(--wine-800)] hover:bg-[color-mix(in_srgb,var(--wine-800)_7%,transparent)]",
  danger:
    "border border-[color-mix(in_srgb,var(--danger)_22%,transparent)] bg-white text-[var(--danger)] hover:bg-[#fff0f0]",
} as const;

export type ButtonVariant = keyof typeof variants;

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
