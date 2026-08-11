import Link from "next/link";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { PublicHeader, PublicFooter } from "@/components/public/PublicHeader";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const vacancies = await db.vacancy.findMany({
    where: { status: "PUBLISHED" },
    include: { department: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Open roles</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Join the team running CareNexa Hospital.</p>

        <div className="mt-6 space-y-3">
          {vacancies.length === 0 ? (
            <Panel className="p-6 text-sm text-[var(--color-text-muted)]">No open roles right now — check back soon.</Panel>
          ) : (
            vacancies.map((v) => (
              <Panel key={v.id} className="p-5">
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
