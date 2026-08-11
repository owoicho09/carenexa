import { clsx } from "clsx";

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
