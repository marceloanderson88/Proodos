import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <header className="surface-card relative overflow-hidden px-6 py-7 sm:px-8">
      <div
        className="dot-field absolute inset-y-0 right-0 w-64 opacity-25"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="eyebrow inline-flex items-center gap-2">
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--wine-950)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
        {actions && (
          <div className="relative flex flex-wrap gap-3">{actions}</div>
        )}
      </div>
    </header>
  );
}
