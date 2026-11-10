"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "./Icon";

const NAV = [
  { href: "#continuity", label: "Continuity of care" },
  { href: "#journey", label: "Patient journey" },
  { href: "#features", label: "Platform" },
  { href: "#security", label: "Security" },
  { href: "#goal", label: "Our goal" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Logo size={30} />
          <span className="text-base font-semibold text-[var(--color-text)]">CareNexa</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-md px-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-page)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md bg-[var(--color-brand)] px-3.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Try the demo
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text)] hover:bg-[var(--color-page)] md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 md:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-page)]"
            >
              {item.label}
            </a>
          ))}
          <Link href="/login" className="block rounded-md px-2 py-2.5 text-sm font-medium text-[var(--color-brand)]" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
