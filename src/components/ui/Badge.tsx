import { clsx } from "clsx";

export type Tone = "neutral" | "brand" | "danger" | "warning" | "success";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[var(--color-page)] text-[var(--color-text-muted)] border-[var(--color-border-strong)]",
  brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand)]/20",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/20",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/20",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone]
      )}
    >
      {children}
    </span>
  );
}
