"use client";

import { useEffect } from "react";
import { Geist } from "next/font/google";
import { Logo } from "@/components/ui/Logo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" data-theme="light" className={`${geistSans.variable} antialiased`}>
      <body className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={40} />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Something went wrong</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            The app hit an unexpected error. It&rsquo;s usually temporary — try again.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-[var(--color-text-faint)]">Reference: {error.digest}</p>
          )}
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
