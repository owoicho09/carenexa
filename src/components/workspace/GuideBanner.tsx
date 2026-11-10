"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const KEY = "carenexa-guide-banner-dismissed";

// First-visit pointer to the onboarding guide. Dismissal is a per-browser
// convenience only; the guide is always reachable from the header.
function readDismissed() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
const noSubscription = () => () => {};

export function GuideBanner() {
  const pathname = usePathname();
  // Server snapshot = dismissed, so the banner never flashes during hydration.
  const storedDismissed = useSyncExternalStore(noSubscription, readDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);
  const visible = !storedDismissed && !dismissedNow;

  function dismiss() {
    setDismissedNow(true);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // storage unavailable (private mode) — hiding for this page view is enough
    }
  }

  if (!visible || pathname === "/guide") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-4 py-2 text-sm print:hidden">
      <p className="text-[var(--color-text)]">
        <span className="font-semibold">New to CareNexa?</span> The guide explains the system and walks you through a referral between the two hospitals.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/guide" className="font-medium text-[var(--color-brand)] hover:underline">Open the guide</Link>
        <button type="button" onClick={dismiss} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" aria-label="Dismiss">
          Dismiss
        </button>
      </div>
    </div>
  );
}
