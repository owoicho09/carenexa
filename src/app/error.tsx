"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Something went wrong</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          This page hit an error. It&rsquo;s usually temporary — try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--color-text-faint)]">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
