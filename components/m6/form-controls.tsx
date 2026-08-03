import { cn } from "@/lib/utils";

export const inputClassName =
  "mt-2 w-full rounded-xl border border-[#751118]/12 bg-white px-3.5 py-3 text-sm text-[#321c1c] shadow-sm outline-none transition placeholder:text-[#a99e99] focus:border-[#921a20]/45 focus:ring-4 focus:ring-[#921a20]/8";

export function Field({
  label,
  name,
  children,
  hint,
  className,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label
      data-field={name}
      className={cn("block text-xs font-extrabold text-[#5b4545]", className)}
    >
      <span>{label}</span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[0.65rem] leading-5 font-normal text-[#897a75]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function SubmitButton({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#751118] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgb(117_17_24/18%)] transition hover:-translate-y-0.5 hover:bg-[#921a20] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}
