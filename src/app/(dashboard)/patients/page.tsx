import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

function formatAge(dateOfBirth: Date) {
  const ms = Date.now() - dateOfBirth.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const patients = await db.patient.findMany({
    where: {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { hospitalNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { cardType: true },
    orderBy: { fullName: "asc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" description="Every patient ever registered — findable by name, phone, or hospital number." />

      <Panel className="p-4">
        <form className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Search by name, phone, or hospital number…" className="max-w-md" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </Panel>

      <Panel>
        {patients.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No patients match that search.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Hospital No.</th>
                <th className="py-2 font-medium">Card Type</th>
                <th className="py-2 font-medium">Age / Sex</th>
                <th className="py-2 font-medium">Phone</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{p.fullName}</td>
                  <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{p.hospitalNumber}</td>
                  <td className="py-2.5"><Badge tone="brand">{p.cardType.name}</Badge></td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{formatAge(p.dateOfBirth)} / {p.sex === "MALE" ? "M" : "F"}</td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{p.phone}</td>
                  <td className="py-2.5 text-right pr-4">
                    <Link href={`/patients/${p.id}`} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
                      Open record
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
