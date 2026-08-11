// Set `monochrome` when placing the mark on an already-colored surface (e.g. the
// brand-blue banner on the printable patient card) — it drops the background
// square and renders just the pulse mark in `currentColor` so it doesn't box-in-a-box.
// Wrap with a `text-*` class (e.g. text-white) to set the mark's color in that mode.
export function Logo({ size = 32, className, monochrome = false }: { size?: number; className?: string; monochrome?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="CareNexa"
    >
      {!monochrome && (
        <>
          <defs>
            <linearGradient id="carenexa-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2f6fe0" />
              <stop offset="1" stopColor="#123f82" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="url(#carenexa-logo-grad)" />
        </>
      )}
      <path
        d="M5 20.5H12.5L15.5 12L19.5 29L23.5 8L27 20.5H35"
        fill="none"
        stroke={monochrome ? "currentColor" : "white"}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="20.5" r="2" fill={monochrome ? "currentColor" : "white"} />
      <circle cx="35" cy="20.5" r="2" fill={monochrome ? "currentColor" : "white"} />
    </svg>
  );
}
