import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { PublicHeader, PublicFooter } from "@/components/public/PublicHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Careers — CareNexa Hospital",
  description: "Open clinical and support roles at CareNexa Hospital in Lagos, Nigeria.",
};

export default async function CareersPage() {
  const vacancies = await db.vacancy.findMany({
    where: { status: "PUBLISHED" },
    include: { department: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <PublicHeader />

      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="text-xs font-medium tracking-wide text-[var(--color-brand)] uppercase">Careers</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-text)]">Join the team running CareNexa Hospital</h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--color-text-muted)]">
            We&rsquo;re hiring across clinical and support roles — every application is screened and reviewed by
            our recruitment team.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          {vacancies.length} open role{vacancies.length === 1 ? "" : "s"}
        </p>

        <div className="mt-4 space-y-3">
          {vacancies.length === 0 ? (
            <Panel className="p-6 text-sm text-[var(--color-text-muted)]">No open roles right now — check back soon.</Panel>
          ) : (
            vacancies.map((v) => (
              <Panel key={v.id} className="p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--color-text)]">{v.title}</h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {v.department?.name ?? "General"} &middot; {v.employmentType} &middot; {v.location}
                    </p>
                  </div>
                  <Badge tone="brand">{v.employmentType}</Badge>
                </div>
                <p className="mt-3 text-sm text-[var(--color-text)]">{v.description}</p>
                <Link href={`/careers/${v.id}`} className="mt-3 inline-block text-sm font-medium text-[var(--color-brand)] hover:underline">
                  View role & apply →
                </Link>
              </Panel>
            ))
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
