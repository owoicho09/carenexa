"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button, LinkButton } from "@/components/ui/Button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Something went wrong</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          This page hit an error loading your data. It&rsquo;s usually temporary — try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--color-text-faint)]">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <LinkButton href="/admin" variant="secondary">
            Go to dashboard
          </LinkButton>
        </div>
        <p className="mt-4 text-xs text-[var(--color-text-faint)]">
          Still stuck? <Link href="/login" className="text-[var(--color-brand)] hover:underline">Sign in again</Link>, or contact Hospital Administration.
        </p>
      </div>
    </div>
  );
}
