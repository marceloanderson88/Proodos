import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[color-mix(in_srgb,var(--wine-800)_18%,transparent)] bg-[var(--surface-subtle)] p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--wine-800)]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="operational-heading mt-4 text-lg text-[var(--text-strong)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
