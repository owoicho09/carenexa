import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/Panel";
import { ApplyForm } from "./ApplyForm";
import { PublicHeader, PublicFooter } from "@/components/public/PublicHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ vacancyId: string }> }): Promise<Metadata> {
  const { vacancyId } = await params;
  const vacancy = await db.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy) return { title: "Careers — CareNexa Hospital" };
  return {
    title: `${vacancy.title} — Careers at CareNexa Hospital`,
    description: vacancy.description,
  };
}

export default async function VacancyPublicPage({ params }: { params: Promise<{ vacancyId: string }> }) {
  const { vacancyId } = await params;

  const vacancy = await db.vacancy.findUnique({ where: { id: vacancyId }, include: { department: true } });
  if (!vacancy || vacancy.status !== "PUBLISHED") notFound();

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/careers" className="text-sm text-[var(--color-brand)] hover:underline">← All roles</Link>

        <h1 className="mt-4 text-2xl font-semibold text-[var(--color-text)]">{vacancy.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {vacancy.department?.name ?? "General"} &middot; {vacancy.employmentType} &middot; {vacancy.location}
        </p>

        <Panel className="mt-6 p-5">
          <p className="text-sm text-[var(--color-text)]">{vacancy.description}</p>
          <p className="mt-4 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Requirements</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[var(--color-text-muted)]">
            {vacancy.requirements.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </Panel>

        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Apply for this role</h2>
          <Panel className="p-5">
            <ApplyForm vacancyId={vacancy.id} />
          </Panel>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
