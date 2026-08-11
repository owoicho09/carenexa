import { redirect } from "next/navigation";
import { readSession, homeRoute } from "@/lib/auth";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/public/PublicHeader";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await readSession();
  if (session) redirect(homeRoute(session));

  const departments = await db.department.findMany({
    where: { slug: { notIn: ["administration", "recruitment"] } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <PublicHeader />

      <main>
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-[var(--color-brand)] uppercase">Lagos, Nigeria</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">
            One hospital record. Every department connected.
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--color-text-muted)]">
            CareNexa Hospital brings records, nursing, consultation, laboratory, and pharmacy onto a single
            patient record — so nothing gets re-asked, re-typed, or lost between departments.
          </p>
          <div className="mt-6 flex gap-3">
            <LinkButton href="#services">Our departments</LinkButton>
            <LinkButton href="/careers" variant="secondary">View careers</LinkButton>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Departments</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Where care happens, and how patients reach each one.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <Panel key={d.id} className="p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{d.name}</h3>
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
          <Panel className="flex flex-wrap items-center justify-between gap-4 p-8">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Join the team</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">We&rsquo;re hiring across clinical and support roles.</p>
            </div>
            <LinkButton href="/careers">See open roles →</LinkButton>
          </Panel>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
