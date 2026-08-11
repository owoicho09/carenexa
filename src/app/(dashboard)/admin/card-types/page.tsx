import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { NewCardTypeForm } from "./NewCardTypeForm";

export default async function CardTypesPage() {
  const cardTypes = await db.cardType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { patients: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Card types" description="Each type has its own hospital-number series, e.g. GOP/2026/00412." />

      <Panel>
        <PanelHeader title={`${cardTypes.length} card type${cardTypes.length === 1 ? "" : "s"}`} />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Series</th>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Patients</th>
            </tr>
          </thead>
          <tbody>
            {cardTypes.map((c) => (
              <tr key={c.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                <td className="p-0">
                  <Link href={`/admin/card-types/${c.id}/edit`} className="block px-4 py-2.5 font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                    {c.name}
                  </Link>
                </td>
                <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{c.seriesCode}</td>
                <td className="py-2.5 max-w-md text-[var(--color-text-muted)]">{c.description}</td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{c._count.patients}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Add a card type</h2>
        <NewCardTypeForm />
      </Panel>
    </div>
  );
}
