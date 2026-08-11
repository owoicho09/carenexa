import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";

type QueueRequest = {
  id: string;
  requestType: string;
  reason: string;
  urgency: "ROUTINE" | "URGENT" | "EMERGENCY";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "QUERIED";
  createdAt: Date;
  visit: { patient: { id: string; fullName: string; hospitalNumber: string } };
  fromDepartment: { name: string };
  requestedBy: { fullName: string };
};

const urgencyTone: Record<QueueRequest["urgency"], Tone> = {
  ROUTINE: "neutral",
  URGENT: "warning",
  EMERGENCY: "danger",
};

export function QueueTable({ requests, emptyLabel }: { requests: QueueRequest[]; emptyLabel: string }) {
  if (requests.length === 0) {
    return <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
          <th className="px-4 py-2 font-medium">Patient</th>
          <th className="py-2 font-medium">Request</th>
          <th className="py-2 font-medium">Reason</th>
          <th className="py-2 font-medium">From</th>
          <th className="py-2 font-medium">Urgency</th>
          <th className="py-2 font-medium">Requested</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0">
            <td className="px-4 py-2.5">
              <p className="font-medium text-[var(--color-text)]">{r.visit.patient.fullName}</p>
              <p className="font-mono text-xs text-[var(--color-text-muted)]">{r.visit.patient.hospitalNumber}</p>
            </td>
            <td className="py-2.5 text-[var(--color-text)]">{r.requestType}</td>
            <td className="py-2.5 max-w-xs text-[var(--color-text-muted)]">{r.reason}</td>
            <td className="py-2.5 text-[var(--color-text-muted)]">{r.fromDepartment.name}</td>
            <td className="py-2.5">
              <Badge tone={urgencyTone[r.urgency]}>{r.urgency}</Badge>
            </td>
            <td className="py-2.5 text-[var(--color-text-muted)]">{r.createdAt.toLocaleString("en-NG")}</td>
            <td className="py-2.5 text-right pr-4">
              <div className="flex justify-end gap-3">
                <Link href={`/requests/${r.id}`} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
                  Handle
                </Link>
                <Link href={`/patients/${r.visit.patient.id}`} className="text-sm text-[var(--color-text-muted)] hover:underline">
                  Record
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
