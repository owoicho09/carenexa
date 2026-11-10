import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";

function ReferralList({ referrals, emptyLabel }: { referrals: { id: string; requestedService: string; urgency: string; status: string; createdAt: Date; sourceHospital: { name: string }; destinationHospital: { name: string }; identity: { universalPatientNumber: string } }[]; emptyLabel: string }) {
  if (referrals.length === 0) return <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>;

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {referrals.map((referral) => (
        <li key={referral.id}>
          <Link href={`/referrals/${referral.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-page)]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)]">{referral.requestedService}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {referral.sourceHospital.name} to {referral.destinationHospital.name} · {referral.identity.universalPatientNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={referral.urgency === "EMERGENCY" ? "danger" : referral.urgency === "URGENT" ? "warning" : "neutral"}>{referral.urgency}</Badge>
              <Badge tone={referral.status === "COMPLETED" ? "success" : "brand"}>{referral.status.replaceAll("_", " ")}</Badge>
              <span className="text-xs text-[var(--color-text-faint)]">{referral.createdAt.toLocaleDateString()}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ReferralsPage() {
  const session = await requireSession();
  const [outgoing, incoming] = await Promise.all([
    db.referral.findMany({
      where: { sourceHospitalId: session.hospitalId },
      include: { sourceHospital: true, destinationHospital: true, identity: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.referral.findMany({
      where: { destinationHospitalId: session.hospitalId },
      include: { sourceHospital: true, destinationHospital: true, identity: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="CareNexa Connect" description="Incoming and outgoing hospital referrals." />
      <Panel>
        <PanelHeader title={`Incoming · ${incoming.length}`} />
        <ReferralList referrals={incoming} emptyLabel="No referrals received." />
      </Panel>
      <Panel>
        <PanelHeader title={`Outgoing · ${outgoing.length}`} />
        <ReferralList referrals={outgoing} emptyLabel="No referrals sent." />
      </Panel>
    </div>
  );
}
