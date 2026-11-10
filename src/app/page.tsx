import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession, homeRoute } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Icon } from "@/components/landing/Icon";

export const metadata: Metadata = {
  title: "CareNexa — Connected care across hospitals",
  description:
    "CareNexa connects hospitals on one network: a single patient identity, patient-controlled record sharing, tracked referrals and AI-assisted clinical insight.",
};

const PROBLEMS = [
  { icon: "patient", title: "Patients repeat their story", body: "Every new hospital starts from a blank file, so history, allergies and results are asked for again — or missed." },
  { icon: "referral", title: "Referrals go missing", body: "Paper referral letters travel with the patient. Nobody knows if they arrived, were seen, or what happened next." },
  { icon: "records", title: "Care reports never come back", body: "The referring doctor rarely receives the specialist's findings, so follow-up depends on the patient remembering." },
];

const FEATURES = [
  { icon: "records", title: "One record per hospital", body: "Registration, vitals, consultations, lab results, prescriptions and notes on a single permanent patient file, shared across every department." },
  { icon: "identity", title: "Universal CareNexa ID", body: "One network identity per patient, linked to each hospital's own record — records stay separate, the person stays the same." },
  { icon: "consent", title: "Patient-controlled sharing", body: "Records move between hospitals only with the patient's consent, for the categories they choose, for a limited time — and can be revoked." },
  { icon: "referral", title: "CareNexa Connect referrals", body: "Send, accept, check in, treat and discharge, with every step timestamped and visible to both hospitals — and the care report returned." },
  { icon: "insight", title: "Clinical intelligence", body: "AI observations on risks, patterns and history that cite the exact records behind them, alongside clear rule-based flags." },
  { icon: "audit", title: "Complete audit trail", body: "Every view of shared records, consent decision, referral step and AI access is logged, per hospital." },
];

const STEPS = [
  { title: "Register once", body: "The patient is registered at their hospital and receives a CareNexa ID. Identity is checked in person." },
  { title: "Refer with consent", body: "The clinician refers to another CareNexa hospital. The patient chooses which records travel with them." },
  { title: "Receive and treat", body: "The receiving hospital registers the patient, accepts the referral and confirms check-in — the referring hospital sees each step." },
  { title: "Report comes home", body: "On discharge, the care report returns to the referring hospital and is stored on the patient's record." },
];

const MODULES = [
  { icon: "records", title: "Records & registration", body: "Hospital numbers, card types, patient search and printable cards." },
  { icon: "nursing", title: "Nursing & vitals", body: "Triage queues and vitals that trend across visits." },
  { icon: "people", title: "Consultation", body: "Diagnoses, plans and notes, with AI drafting a clinician signs off." },
  { icon: "lab", title: "Laboratory", body: "Requests, results and abnormal flags against reference ranges." },
  { icon: "pharmacy", title: "Pharmacy", body: "Prescriptions sent electronically and dispensing recorded." },
  { icon: "calendar", title: "Appointments & messaging", body: "Bookings, follow-ups and patient messages on the record." },
  { icon: "hospital", title: "Administration", body: "Departments, staff, permissions and live hospital overview." },
  { icon: "people", title: "Recruitment", body: "Vacancies, applications and AI-assisted CV screening." },
];

const TRUST = [
  { icon: "hospital", title: "Hospital-level isolation", body: "Each hospital sees only its own patients and staff. Knowing a record ID never grants access." },
  { icon: "identity", title: "Identity checked in person", body: "Shared records open only after the receiving hospital verifies the patient's identity." },
  { icon: "consent", title: "Consent separate from identity", body: "Verification and patient authorization are two independent checks. Both are required." },
  { icon: "alert", title: "Governed emergency access", body: "Emergency access needs a written reason, lasts one hour and is fully audited — it never bypasses control silently." },
  { icon: "lock", title: "Expiring, revocable access", body: "Every grant has a scope and an end date, and can be withdrawn at any time." },
  { icon: "check", title: "Human in the loop", body: "AI suggestions are labelled, evidence-linked and reviewed. They never become diagnoses or prescriptions on their own." },
];

const METRICS = [
  "Referral acknowledgment time",
  "Referral completion rate",
  "Missing clinical information rate",
  "Patient arrival confirmation rate",
  "Discharge summary return rate",
];

const AUDIENCES = [
  { icon: "hospital", title: "Hospitals", body: "Run every department on one system and join a network of connected facilities." },
  { icon: "people", title: "Clinicians", body: "See the history that matters, refer in minutes and get the outcome back." },
  { icon: "patient", title: "Patients", body: "Tell your story once and decide who sees your records." },
  { icon: "network", title: "Health networks", body: "Measure referral performance from real, recorded events." },
];

function SectionHeading({ eyebrow, title, body, id }: { eyebrow: string; title: string; body?: string; id?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p id={id} className="text-xs font-semibold tracking-widest text-[var(--color-brand)] uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 text-base leading-relaxed text-[var(--color-text-muted)]">{body}</p>}
    </div>
  );
}

function IconTile({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
      <Icon name={name} />
    </span>
  );
}

// Static illustration of a referral moving between two hospitals.
function HeroPreview() {
  const steps = [
    { label: "Sent", done: true },
    { label: "Accepted", done: true },
    { label: "Checked in", done: true },
    { label: "Report returned", done: false },
  ];
  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl shadow-[#1d5fbf]/10 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Referral · Cardiology assessment</p>
        <span className="rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-success)]">Checked in</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="rounded-lg border border-[var(--color-border)] p-2.5">
          <span className="block h-1.5 w-8 rounded-full bg-[#2563eb]" />
          <p className="mt-2 text-xs font-semibold text-[var(--color-text)]">General Hospital</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Referring</p>
        </div>
        <span className="text-[var(--color-text-faint)]"><Icon name="arrow" /></span>
        <div className="rounded-lg border border-[var(--color-border)] p-2.5">
          <span className="block h-1.5 w-8 rounded-full bg-[#7c3aed]" />
          <p className="mt-2 text-xs font-semibold text-[var(--color-text)]">Specialist Hospital</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Receiving</p>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-1">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-col items-center text-center">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${s.done ? "bg-[var(--color-success)] text-white" : "border border-[var(--color-border)] text-[var(--color-text-faint)]"}`}>
              {s.done ? "✓" : i + 1}
            </span>
            <span className="mt-1 text-[10px] leading-tight text-[var(--color-text-muted)]">{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 space-y-2 rounded-lg bg-[var(--color-page)] p-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <span className="text-[var(--color-success)]"><Icon name="consent" className="h-4 w-4" /></span>
          Patient authorized: labs, diagnoses, prescriptions
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <span className="text-[var(--color-brand)]"><Icon name="identity" className="h-4 w-4" /></span>
          Identity verified in person · CNX-7F2A…
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <span className="text-[var(--color-warning)]"><Icon name="insight" className="h-4 w-4" /></span>
          AI insight: LDL above range on 2 visits — review
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await readSession();
  if (session) redirect(homeRoute(session));

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-page)]">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle at 10% 10%, #1d5fbf 0, transparent 40%), radial-gradient(circle at 90% 30%, #7c3aed 0, transparent 35%)" }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--color-brand)]">
                <Icon name="network" className="h-3.5 w-3.5" /> Connected healthcare network
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                One patient. Every hospital. <span className="text-[var(--color-brand)]">Connected care.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
                CareNexa runs each hospital on a single patient record and connects hospitals into one network — so referrals are tracked, records travel with the patient&rsquo;s consent, and the care report always comes back.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-brand)] px-5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]">
                  Try the live demo
                </Link>
                <a href="#how-it-works" className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-page)]">
                  See how it works
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-text-muted)]">
                {["Patient-controlled sharing", "Tracked referrals", "Full audit trail"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <span className="text-[var(--color-success)]"><Icon name="check" className="h-4 w-4" /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="The problem" title="Care breaks down between hospitals" body="Inside one hospital, information gets lost between departments. Between hospitals, it often never arrives at all." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)]"><Icon name={p.icon} /></span>
                <h3 className="mt-4 font-semibold text-[var(--color-text)]">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeading id="features" eyebrow="Features" title="Everything a connected hospital needs" body="A complete hospital system on the inside, and a secure network on the outside." />
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <IconTile name={f.icon} />
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading id="how-it-works" eyebrow="How it works" title="From referral to report, in four steps" />
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-4 font-semibold text-[var(--color-text)]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Modules / services */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeading id="modules" eyebrow="Modules" title="Built for every department" body="Each department works from the same record, passing patients along with requests instead of paper." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((m) => (
                <div key={m.title} className="rounded-xl border border-[var(--color-border)] p-5 transition-shadow hover:shadow-md">
                  <IconTile name={m.icon} />
                  <h3 className="mt-4 text-sm font-semibold text-[var(--color-text)]">{m.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security & trust */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading id="security" eyebrow="Security & privacy" title="Designed around patient control" body="Access is enforced on the server for every request — not hidden behind the interface." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-success-soft)] text-[var(--color-success)]"><Icon name={t.icon} /></span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Goal + who it's for */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
            <div>
              <p id="goal" className="text-xs font-semibold tracking-widest text-[var(--color-brand)] uppercase">Our goal</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">Continuity of care, wherever the patient goes</h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--color-text-muted)]">
                We believe a patient&rsquo;s history should follow them safely between hospitals — with the patient in control and every clinician working from the full picture. CareNexa connects hospitals without merging their records, and measures whether care actually reaches the patient.
              </p>
              <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-page)] p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <span className="text-[var(--color-brand)]"><Icon name="chart" className="h-4 w-4" /></span>
                  What we measure, from recorded events
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {METRICS.map((m) => (
                    <li key={m} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                      <span className="mt-0.5 text-[var(--color-success)]"><Icon name="check" className="h-4 w-4" /></span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-[var(--color-brand)] uppercase">Who it&rsquo;s for</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {AUDIENCES.map((a) => (
                  <div key={a.title} className="rounded-xl border border-[var(--color-border)] p-5">
                    <IconTile name={a.icon} />
                    <h3 className="mt-4 font-semibold text-[var(--color-text)]">{a.title}</h3>
                    <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-12" style={{ background: "linear-gradient(135deg, #1d5fbf, #123f82)" }}>
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0, transparent 40%)" }} />
            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">See a referral travel between two hospitals</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/80">
                Sign in to the demo, switch between General Hospital and Specialist Hospital, and follow the guided walkthrough.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-medium text-[var(--color-brand)] hover:bg-white/90">
                  Try the live demo
                </Link>
                <Link href="/careers" className="inline-flex h-11 items-center justify-center rounded-md border border-white/40 px-5 text-sm font-medium text-white hover:bg-white/10">
                  Careers at our hospitals
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Logo size={26} />
              <span className="font-semibold text-[var(--color-text)]">CareNexa</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[var(--color-text-muted)]">
              Connected care across hospitals — one patient identity, patient-controlled sharing and tracked referrals.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
              <li><a href="#features" className="hover:text-[var(--color-text)]">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[var(--color-text)]">How it works</a></li>
              <li><a href="#security" className="hover:text-[var(--color-text)]">Security</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Access</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
              <li><Link href="/login" className="hover:text-[var(--color-text)]">Sign in</Link></li>
              <li><Link href="/careers" className="hover:text-[var(--color-text)]">Careers</Link></li>
              <li><a href="mailto:info@carenexa.cloud" className="hover:text-[var(--color-text)]">info@carenexa.cloud</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)]">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[var(--color-text-faint)] sm:px-6">
            © {new Date().getFullYear()} CareNexa. Prototype demonstration using synthetic patient data — not for clinical use.
          </p>
        </div>
      </footer>
    </div>
  );
}
