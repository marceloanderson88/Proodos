import { cn } from "@/lib/utils";

export const controlClassName =
  "mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--text-strong)] shadow-sm outline-none transition placeholder:text-[#a99e99] focus:border-[color-mix(in_srgb,var(--wine-700)_48%,transparent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--wine-700)_9%,transparent)] aria-invalid:border-[var(--danger)] aria-invalid:ring-[color-mix(in_srgb,var(--danger)_9%,transparent)]";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const descriptionId = hint || error ? `${htmlFor}-description` : undefined;
  return (
    <div className={cn("block", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-extrabold text-[var(--text)]"
      >
        {label}
        {required && <span className="ml-1 text-[var(--danger)]">*</span>}
      </label>
      {children}
      {(hint || error) && (
        <p
          id={descriptionId}
          className={cn(
            "mt-1.5 text-[0.68rem] leading-5",
            error
              ? "font-bold text-[var(--danger)]"
              : "text-[var(--text-muted)]",
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
