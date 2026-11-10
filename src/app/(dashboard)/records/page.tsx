import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { QuickActionsBar } from "./QuickActionsBar";
import { requireSession } from "@/lib/auth";

function formatAge(dateOfBirth: Date) {
  const ms = Date.now() - dateOfBirth.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const query = q?.trim();

  const patients = query
    ? await db.patient.findMany({
        where: {
          hospitalId: session.hospitalId,
          isDeleted: false,
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { hospitalNumber: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { cardType: true },
        take: 25,
        orderBy: { fullName: "asc" },
      })
    : [];

  const recentVisits = await db.visit.findMany({
    where: { hospitalId: session.hospitalId, status: "OPEN" },
    include: { patient: { include: { cardType: true } } },
    orderBy: { openedAt: "desc" },
    take: 10,
  });

  const departments = await db.department.findMany({
    where: { hospitalId: session.hospitalId, isArchived: false, acceptsRequestTypes: { isEmpty: false } },
    orderBy: { name: "asc" },
  });
  const fromOptions = session.departmentId
    ? null
    : await db.department.findMany({ where: { hospitalId: session.hospitalId, isArchived: false }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Records" description="Find an existing patient, register a new one, or act on one right now." />
      <QuickActionsBar departments={departments} fromOptions={fromOptions} />

      <Panel className="p-4">
        <form className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Search by name, phone, or hospital number…" className="max-w-md" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        {query && (
          <div className="mt-4 overflow-x-auto">
            {patients.length === 0 ? (
              <p className="py-6 text-sm text-[var(--color-text-muted)]">
                No patient found for &ldquo;{query}&rdquo;.{" "}
                <Link href="/records/register" className="font-medium text-[var(--color-brand)] hover:underline">
                  Register them as a new patient.
                </Link>
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 font-medium">Hospital No.</th>
                    <th className="py-2 font-medium">Card Type</th>
                    <th className="py-2 font-medium">Phone</th>
                    <th className="py-2 font-medium">Age / Sex</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                      <td className="p-0">
                        <Link href={`/patients/${p.id}`} className="block px-0 py-2.5 font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                          {p.fullName}
                        </Link>
                      </td>
                      <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{p.hospitalNumber}</td>
                      <td className="py-2.5">
                        <Badge tone="brand">{p.cardType.name}</Badge>
                      </td>
                      <td className="py-2.5 text-[var(--color-text-muted)]">{p.phone}</td>
                      <td className="py-2.5 text-[var(--color-text-muted)]">
                        {formatAge(p.dateOfBirth)} / {p.sex === "MALE" ? "M" : "F"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Patients currently in the hospital</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Visits opened today and not yet closed.</p>
        </div>
        {recentVisits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No open visits right now.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Hospital No.</th>
                <th className="py-2 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.map((v) => (
                <tr key={v.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                  <td className="p-0">
                    <Link href={`/patients/${v.patient.id}`} className="block px-4 py-2.5 font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                      {v.patient.fullName}
                    </Link>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{v.patient.hospitalNumber}</td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{v.openedAt.toLocaleString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
