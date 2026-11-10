// Small stroke icon set for the landing page (24px grid, currentColor).
const PATHS: Record<string, string> = {
  records: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  identity: "M4 6h16v12H4zM9 10.5a1.5 1.5 0 1 0 0 .01M6.5 15c.6-1.4 1.6-2 2.5-2s1.9.6 2.5 2M14 10h4M14 13h3",
  consent: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4",
  referral: "M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4",
  insight: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  audit: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h3",
  hospital: "M4 21V8l8-5 8 5v13M9 21v-5h6v5M12 8v4M10 10h4",
  nursing: "M3 12h4l2-5 3 10 2-7 1.5 2H21",
  lab: "M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3M7.5 15h9",
  pharmacy: "M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 10l7 7",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.7-3 3-5 6-5s5.3 2 6 5M16 5a3 3 0 0 1 0 6M18 15c1.6.6 2.6 2.4 3 5",
  shield: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  alert: "M12 4l9 16H3zM12 10v4M12 17v.01",
  check: "M5 12l4 4 10-10",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12v.01",
  patient: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  network: "M12 5a2 2 0 1 0 0-.01M5 19a2 2 0 1 0 0-.01M19 19a2 2 0 1 0 0-.01M12 7v4M12 11l-6 6M12 11l6 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d={PATHS[name] ?? PATHS.check} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
