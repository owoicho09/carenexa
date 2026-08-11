import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export function PublicHeader() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-base font-semibold text-[var(--color-text)]">CareNexa Hospital</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/#services" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Services</Link>
          <Link href="/careers" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Careers</Link>
          <LinkButton href="/login" variant="secondary" size="sm">Staff Login</LinkButton>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-[var(--color-text-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-[var(--color-text)]">CareNexa Hospital</p>
            <p className="mt-1">14 Allen Avenue, Ikeja, Lagos, Nigeria</p>
            <p>+234 803 000 1122 &middot; info@carenexa.ng</p>
          </div>
          <div className="flex gap-6">
            <Link href="/careers" className="hover:text-[var(--color-text)]">Careers</Link>
            <Link href="/login" className="hover:text-[var(--color-text)]">Staff Login</Link>
          </div>
        </div>
        <p className="mt-6 text-xs text-[var(--color-text-faint)]">© {new Date().getFullYear()} CareNexa Hospital. All rights reserved.</p>
      </div>
    </footer>
  );
}
