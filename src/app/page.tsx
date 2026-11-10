import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession, homeRoute } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Icon } from "@/components/landing/Icon";

export const metadata: Metadata = {
  title: "CareNexa — Continuity of care across every hospital",
  description:
    "CareNexa connects every stage of a patient's healthcare journey — across departments and hospitals — so no patient is forgotten, no critical information is lost, and no stage of treatment is disconnected.",
};

// The five elements of continuity of care, and how CareNexa delivers each.
const ELEMENTS = [
  {
    icon: "network",
    title: "Continuous access",
    body: "Patients can access care whenever they need it.",
    how: "One CareNexa ID recognised by every hospital on the network.",
  },
  {
    icon: "records",
    title: "Consistent medical records",
    body: "History, diagnoses and treatments are preserved and available to authorised professionals.",
    how: "A permanent record at each hospital, shared between hospitals with the patient's consent.",
  },
  {
    icon: "people",
    title: "Coordinated treatment",
    body: "Doctors, nurses, pharmacists, laboratory scientists and rehabilitation professionals work together.",
    how: "Department requests inside the hospital and tracked referrals between hospitals.",
  },
  {
    icon: "calendar",
    title: "Follow-up and monitoring",
    body: "Progress is monitored after treatment so complications are caught early.",
    how: "Follow-up dates, appointments, overdue follow-up flags and returned care reports.",
  },
  {
    icon: "patient",
    title: "Long-term patient support",
    body: "Care continues through recovery, rehabilitation, prevention and disease management.",
    how: "A longitudinal history and AI summaries that span every visit and hospital.",
  },
];

// The stroke example from the continuity-of-care brief, mapped to the product.
const JOURNEY = [
  { stage: "Emergency care", icon: "alert", body: "Immediate medical attention.", carenexa: "Emergency referrals and audited emergency access when the patient can't consent." },
  { stage: "Hospital care", icon: "hospital", body: "Investigations, diagnosis and treatment begin.", carenexa: "Vitals, lab results, diagnoses and prescriptions on one record." },
  { stage: "Rehabilitation", icon: "nursing", body: "Physiotherapists and specialists help restore function.", carenexa: "Referral to physiotherapy or a specialist hospital, with history attached." },
  { stage: "Home-based care", icon: "calendar", body: "Guidance, medication support and monitoring at home.", carenexa: "Discharge summary returned home; follow-up dates and patient messages." },
  { stage: "Long-term follow-up", icon: "chart", body: "Recovery is monitored and treatment adjusted.", carenexa: "Overdue follow-up flags and a longitudinal view across hospitals." },
];

const BENEFITS = [
  { icon: "lab", title: "Fewer repeated investigations", body: "Results travel with the patient, so tests aren't redone just because they can't be seen." },
  { icon: "target", title: "No one lost to follow-up", body: "Follow-up dates, referral tracking and returned reports keep every next step visible." },
  { icon: "shield", title: "Safer treatment", body: "Allergies, genotype and prior results are in front of the clinician at the moment of care." },
  { icon: "check", title: "Less fragmented care", body: "One connected record instead of scattered files means fewer gaps and transcription errors." },
  { icon: "patient", title: "Greater patient trust", body: "Patients tell their story once and decide who sees their records." },
  { icon: "insight", title: "Earlier intervention", body: "Trends across visits surface early, supporting prevention rather than reaction." },
];

const TECHNOLOGY: { title: string; body: string; status: "live" | "roadmap" }[] = [
  { title: "Electronic health records", body: "Complete patient records per hospital, across every department.", status: "live" },
  { title: "Digital referrals between hospitals", body: "CareNexa Connect: consent, check-in, treatment and returned reports.", status: "live" },
  { title: "Integrated hospital management", body: "Registration, nursing, consultation, lab, pharmacy, admin and recruitment.", status: "live" },
  { title: "AI-assisted clinical insight", body: "Risks, patterns and summaries — evidence-linked and clinician-reviewed.", status: "live" },
  { title: "Appointment and follow-up messaging", body: "Bookings, follow-up dates and WhatsApp/email messages logged on the record.", status: "live" },
  { title: "Automated medication reminders", body: "Scheduled reminders sent to patients through their preferred channel.", status: "roadmap" },
  { title: "Remote monitoring and telemedicine", body: "Home readings and virtual consultations feeding the same record.", status: "roadmap" },
];

const STEPS = [
  { title: "Register once", body: "The patient is registered at their hospital and receives a CareNexa ID. Identity is checked in person." },
  { title: "Refer with consent", body: "The clinician refers to another CareNexa hospital. The patient chooses which records travel with them." },
  { title: "Receive and treat", body: "The receiving hospital registers the patient, accepts and confirms check-in — the referring hospital sees each step." },
  { title: "Report comes home", body: "On discharge, the care report returns to the referring hospital and is stored on the patient's record." },
];

const TRUST = [
  { icon: "hospital", title: "Hospital-level isolation", body: "Each hospital sees only its own patients. Knowing a record ID never grants access." },
  { icon: "identity", title: "Identity checked in person", body: "Shared records open only after the receiving hospital verifies the patient." },
  { icon: "consent", title: "The patient decides", body: "Sharing needs the patient's authorization, for chosen categories, for a limited time — revocable." },
  { icon: "alert", title: "Governed emergency access", body: "A written reason, a one-hour limit and a full audit trail — never a silent bypass." },
  { icon: "audit", title: "Everything audited", body: "Every view, consent decision, referral step and AI access is logged." },
  { icon: "check", title: "Human in the loop", body: "AI suggestions are labelled and evidence-linked, and never become clinical actions on their own." },
];

const METRICS = [
  "Referral acknowledgment time",
  "Referral completion rate",
  "Missing clinical information rate",
  "Patient arrival confirmation rate",
  "Discharge summary return rate",
];

function SectionHeading({ eyebrow, title, body, id, light = false }: { eyebrow: string; title: string; body?: string; id?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p id={id} className={`scroll-mt-24 text-xs font-semibold tracking-widest uppercase ${light ? "text-white/70" : "text-[var(--color-brand)]"}`}>{eyebrow}</p>
      <h2 className={`mt-2 text-2xl font-semibold tracking-tight sm:text-3xl ${light ? "text-white" : "text-[var(--color-text)]"}`}>{title}</h2>
      {body && <p className={`mt-3 text-base leading-relaxed ${light ? "text-white/80" : "text-[var(--color-text-muted)]"}`}>{body}</p>}
    </div>
  );
}

function IconTile({ name, tone = "brand" }: { name: string; tone?: "brand" | "success" }) {
  const cls = tone === "success" ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cls}`}>
      <Icon name={name} />
    </span>
  );
}

// Hero illustration: one patient's journey, every stage connected.
function JourneyPreview() {
  const stages = [
    { label: "Emergency", where: "General Hospital", accent: "#2563eb", done: true },
    { label: "Specialist care", where: "Specialist Hospital", accent: "#7c3aed", done: true },
    { label: "Rehabilitation", where: "Physiotherapy", accent: "#7c3aed", done: true },
    { label: "Follow-up", where: "General Hospital", accent: "#2563eb", done: false },
  ];
  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl shadow-[#1d5fbf]/10 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><Icon name="patient" className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text)]">One patient journey</p>
            <p className="font-mono text-[11px] text-[var(--color-text-faint)]">CNX-7F2A-91C3</p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-success)]">Connected</span>
      </div>
      <ol className="mt-4 space-y-0">
        {stages.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${s.done ? "bg-[var(--color-success)] text-white" : "border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-text-faint)]"}`}>
                {s.done ? "✓" : i + 1}
              </span>
              {i < stages.length - 1 && <span className="h-6 w-0.5 bg-[var(--color-success)]/40" />}
            </div>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pb-2">
              <p className="text-xs font-semibold text-[var(--color-text)]">{s.label}</p>
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.accent }} />{s.where}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 space-y-2 rounded-lg bg-[var(--color-page)] p-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <span className="text-[var(--color-success)]"><Icon name="records" className="h-4 w-4" /></span>
          Discharge summary returned and stored
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <span className="text-[var(--color-warning)]"><Icon name="calendar" className="h-4 w-4" /></span>
          Follow-up appointment booked in 2 weeks
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
                <Icon name="network" className="h-3.5 w-3.5" /> Continuity of care, connected
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Every stage of care, <span className="text-[var(--color-brand)]">one connected journey.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
                A patient&rsquo;s care doesn&rsquo;t end after one visit. CareNexa connects every department and every hospital they pass through — from emergency to recovery and long-term follow-up.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-brand)] px-5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]">
                  Try the live demo
                </Link>
                <a href="#journey" className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-page)]">
                  Follow a patient journey
                </a>
              </div>
              <ul className="mt-8 grid gap-2 text-sm text-[var(--color-text-muted)] sm:grid-cols-3">
                {["No patient forgotten", "No information lost", "No stage disconnected"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <span className="text-[var(--color-success)]"><Icon name="check" className="h-4 w-4" /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end">
              <JourneyPreview />
            </div>
          </div>
        </section>

        {/* What continuity of care means */}
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p id="continuity" className="scroll-mt-24 text-xs font-semibold tracking-widest text-[var(--color-brand)] uppercase">Continuity of care</p>
          <blockquote className="mt-4 text-xl leading-relaxed font-medium text-[var(--color-text)] sm:text-2xl">
            The coordinated, uninterrupted delivery of care to a patient over time — consistent and connected from the beginning of treatment through recovery, rehabilitation and long-term follow-up.
          </blockquote>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--color-text-muted)]">
            A healthcare journey doesn&rsquo;t end after one visit, consultation or operation. Every stage connects to the next. CareNexa exists to make that connection real — not merely to digitise hospital operations.
          </p>
        </section>

        {/* Five elements */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeading id="elements" eyebrow="The five elements" title="What continuity of care needs — and how CareNexa delivers it" />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {ELEMENTS.map((e, i) => (
                <div key={e.title} className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-page)] p-5">
                  <div className="flex items-center justify-between">
                    <IconTile name={e.icon} />
                    <span className="text-xs font-semibold text-[var(--color-text-faint)]">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--color-text)]">{e.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{e.body}</p>
                  <p className="mt-auto flex gap-1.5 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-text)]">
                    <span className="mt-0.5 shrink-0 text-[var(--color-brand)]"><Icon name="arrow" className="h-4 w-4" /></span>
                    {e.how}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            id="journey"
            eyebrow="One connected journey"
            title="Follow a stroke patient through CareNexa"
            body="Five stages, often across more than one hospital. With CareNexa, each stage picks up exactly where the last one left off."
          />
          <ol className="relative mt-12 grid gap-4 lg:grid-cols-5">
            <span aria-hidden className="absolute top-5 right-[10%] left-[10%] hidden h-0.5 bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#2563eb] opacity-30 lg:block" />
            {JOURNEY.map((j, i) => (
              <li key={j.stage} className="relative flex gap-4 lg:flex-col lg:gap-0">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[var(--color-page)] bg-[var(--color-brand)] text-white">
                  <Icon name={j.icon} className="h-4 w-4" />
                </span>
                <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:mt-4">
                  <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-faint)] uppercase">Stage {i + 1}</p>
                  <h3 className="mt-0.5 font-semibold text-[var(--color-text)]">{j.stage}</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{j.body}</p>
                  <p className="mt-3 rounded-md bg-[var(--color-brand-soft)] px-2.5 py-2 text-xs text-[var(--color-text)]">
                    <span className="font-semibold text-[var(--color-brand)]">CareNexa: </span>{j.carenexa}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-10 max-w-2xl text-center text-base font-medium text-[var(--color-text)]">
            All these stages form one connected healthcare journey. That is continuity of care.
          </p>
        </section>

        {/* Why it matters */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeading id="why" eyebrow="Why it matters" title="Better outcomes come from connected care" />
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-4">
                  <IconTile name={b.icon} tone="success" />
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{b.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            id="features"
            eyebrow="The platform"
            title="Technology that keeps care connected"
            body="Digital health tools only help continuity when they share one patient record. Here is what CareNexa provides today, and what comes next."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECHNOLOGY.map((t) => (
              <div key={t.title} className={`rounded-xl border p-5 ${t.status === "live" ? "border-[var(--color-border)] bg-[var(--color-surface)]" : "border-dashed border-[var(--color-border-strong)] bg-transparent"}`}>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${t.status === "live" ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-page)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"}`}>
                  {t.status === "live" ? "Available now" : "On the roadmap"}
                </span>
                <h3 className="mt-3 font-semibold text-[var(--color-text)]">{t.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How referrals work */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeading id="how-it-works" eyebrow="CareNexa Connect" title="How a referral stays connected" body="The moment care most often breaks — moving between hospitals — is where CareNexa is strongest." />
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-page)] p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-semibold text-white">{i + 1}</span>
                  <h3 className="mt-4 font-semibold text-[var(--color-text)]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading id="security" eyebrow="Security & privacy" title="Connected — and controlled by the patient" body="Access is enforced on the server for every request, not hidden behind the interface." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <IconTile name={t.icon} tone="success" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1d5fbf, #123f82)" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0, transparent 40%), radial-gradient(circle at 10% 90%, #7c3aed 0, transparent 40%)" }} />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p id="goal" className="scroll-mt-24 text-xs font-semibold tracking-widest text-white/70 uppercase">Our goal</p>
              <blockquote className="mt-3 text-2xl leading-snug font-semibold text-white sm:text-3xl">
                &ldquo;The seamless connection of every stage of a patient&rsquo;s healthcare journey — so that no patient is forgotten, no critical information is lost, and no stage of treatment is disconnected.&rdquo;
              </blockquote>
              <p className="mt-5 max-w-xl text-white/80">
                Our aim is not merely to digitise hospital operations, but to connect the entire patient journey into one coordinated healthcare experience.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon name="chart" className="h-4 w-4" /> How we measure continuity
              </p>
              <p className="mt-1 text-xs text-white/70">Calculated from recorded referral events — never typed-in figures.</p>
              <ul className="mt-4 space-y-2">
                {METRICS.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-sm text-white/90">
                    <span className="mt-0.5 text-white"><Icon name="check" className="h-4 w-4" /></span>{m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">See continuity of care in action</h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--color-text-muted)]">
            Sign in to the demo, refer a patient from General Hospital to Specialist Hospital, and watch the care report come back — step by step with the built-in guide.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-brand)] px-5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]">
              Try the live demo
            </Link>
            <a href="#journey" className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-page)]">
              Revisit the journey
            </a>
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
              Continuity of care across every department and hospital — no patient forgotten, no information lost, no stage disconnected.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
              <li><a href="#continuity" className="hover:text-[var(--color-text)]">Continuity of care</a></li>
              <li><a href="#journey" className="hover:text-[var(--color-text)]">Patient journey</a></li>
              <li><a href="#features" className="hover:text-[var(--color-text)]">Platform</a></li>
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
