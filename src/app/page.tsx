import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSession, homeRoute } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/PublicHeader";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CareNexa Hospital — One record, every department connected",
  description:
    "CareNexa Hospital in Lagos runs records, nursing, consultation, laboratory, and pharmacy on a single patient record, so nothing gets re-asked, re-typed, or lost between departments.",
};

function DeptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[var(--color-brand)]">
      <path
        d="M3 12h4l2-5 3 10 2-7 1.5 2H21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const VALUE_PROPS = [
  {
    title: "One record, not eleven",
    body: "Records, vitals, results, prescriptions, and notes live on a single permanent file per patient — visible to whoever is treating them next.",
  },
  {
    title: "Live department routing",
    body: "A patient moves from reception to nursing to the lab to the consulting room with a request that carries the note with it, not a chit of paper.",
  },
  {
    title: "AI-assisted, not AI-run",
    body: "Summaries, note drafting, and CV screening speed up staff — every clinical decision is still made and signed by a human.",
  },
];

export default async function Home() {
  const session = await readSession();
  if (session) redirect(homeRoute(session));

  const [departments, staffCount, patientCount] = await Promise.all([
    db.department.findMany({
      where: { slug: { notIn: ["administration", "recruitment"] } },
      orderBy: { name: "asc" },
    }),
    db.staffMember.count({ where: { isActive: true } }),
    db.patient.count({ where: { isDeleted: false } }),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, #1d5fbf 0, transparent 45%), radial-gradient(circle at 85% 0%, #1d5fbf 0, transparent 40%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-medium tracking-wide text-[var(--color-brand)] uppercase">
              Lagos, Nigeria
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-[var(--color-text)] sm:text-5xl">
              One hospital record. Every department connected.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
              CareNexa Hospital brings records, nursing, consultation, laboratory, and pharmacy onto a single
              patient record — so nothing gets re-asked, re-typed, or lost between departments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="#services">Our departments</LinkButton>
              <LinkButton href="/careers" variant="secondary">View careers</LinkButton>
            </div>

            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--color-border)] pt-8">
              <div>
                <dt className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Departments</dt>
                <dd className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{departments.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Staff on duty</dt>
                <dd className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{staffCount}+</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Patients on file</dt>
                <dd className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{patientCount}+</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {VALUE_PROPS.map((v) => (
              <div key={v.title}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-soft)]">
                  <Logo size={18} monochrome className="text-[var(--color-brand)]" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[var(--color-text)]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Departments</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Where care happens, and how patients reach each one.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <Panel key={d.id} className="p-5 transition-shadow hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-soft)]">
                  <DeptIcon />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[var(--color-text)]">{d.name}</h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{d.description}</p>
              </Panel>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <Panel className="p-8">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">A record that follows the patient, not the department</h2>
            <p className="mt-3 max-w-3xl text-sm text-[var(--color-text-muted)]">
              Every visit, result, prescription, and note lives permanently on one file per patient. Whoever is
              treating a patient can see their full history — and send them wherever the next step is, whether
              that&rsquo;s the laboratory, the pharmacy, or back to the consulting room — without paperwork
              travelling between buildings.
            </p>
          </Panel>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <div
            className="relative overflow-hidden rounded-xl px-8 py-10"
            style={{ background: "linear-gradient(135deg, #1d5fbf, #123f82)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 90% 10%, white 0, transparent 40%)" }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Join the team</h2>
                <p className="mt-1 text-sm text-white/80">We&rsquo;re hiring across clinical and support roles.</p>
              </div>
              <Link
                href="/careers"
                className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-[var(--color-brand)] transition hover:bg-white/90"
              >
                See open roles →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
