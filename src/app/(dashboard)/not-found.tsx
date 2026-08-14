import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Not found</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          That record doesn&rsquo;t exist, or may have been removed.
        </p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/admin">Go to dashboard</LinkButton>
        </div>
      </div>
    </div>
  );
}
