// Visual identity per hospital, so it is always obvious which workspace you
// are in during a demo. Pure; safe to import from client components.

const ACCENTS: Record<string, string> = {
  "general-hospital": "#2563eb", // blue
  "specialist-hospital": "#7c3aed", // violet
};
const FALLBACK = ["#0d9488", "#c2410c", "#be185d", "#4d7c0f"];

export function hospitalAccent(slug: string, index = 0) {
  return ACCENTS[slug] ?? FALLBACK[index % FALLBACK.length];
}

// Where to land after switching hospital. Pages that are not tied to one
// hospital's record (referrals, requests, guide, admin) are kept; a specific
// patient belongs to one hospital only, so those fall back to the patient list.
export function switchDestination(returnTo: string | null | undefined) {
  const path = (returnTo ?? "").split("?")[0];
  if (!path.startsWith("/") || path.startsWith("//")) return "/admin";
  if (/^\/(referrals|access-requests|guide)(\/|$)/.test(path)) return path;
  if (/^\/admin(\/|$)/.test(path)) return path;
  if (/^\/patients(\/|$)/.test(path)) return "/patients";
  return "/admin";
}
