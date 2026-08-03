import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-field";

export const inputClassName = controlClassName;

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
    <Button type="submit" disabled={disabled}>
      {children}
    </Button>
  );
}
