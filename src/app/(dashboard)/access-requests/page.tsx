import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { ApproveRequestForm, DeclineRequestForm } from "@/components/access/AccessRequestForms";
import { accessGrantDisplayStatus, CATEGORY_LABEL } from "@/lib/tenantAccess";
import { revokePatientAccessGrantAction } from "../referrals/actions";

const STATUS_TONE: Record<string, Tone> = {
  PENDING: "warning",
  ACTIVE: "success",
  DECLINED: "danger",
  REVOKED: "neutral",
  EXPIRED: "neutral",
};

function formatDate(d: Date) {
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function categories(list: string[]) {
  return list.map((c) => CATEGORY_LABEL[c] ?? c).join(", ");
}

export default async function AccessRequestsPage() {
  const session = await requireSession();
  const canDecide = ["ADMIN", "CLINICIAN", "RECORDS_OFFICER"].includes(session.role);
  const canRevoke = ["ADMIN", "CLINICIAN"].includes(session.role);

  // Independent requests only; referral-linked grants are managed on the referral.
  const include = {
    identity: { select: { universalPatientNumber: true } },
    sourceHospital: { select: { name: true } },
    receivingHospital: { select: { name: true } },
    requestingStaff: { select: { fullName: true } },
  } as const;
  const [incoming, outgoing] = await Promise.all([
    db.patientAccessGrant.findMany({ where: { sourceHospitalId: session.hospitalId, referralId: null }, include, orderBy: { createdAt: "desc" }, take: 100 }),
    db.patientAccessGrant.findMany({ where: { receivingHospitalId: session.hospitalId, referralId: null }, include, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  // Resolve each identity to THIS hospital's local record only.
  const identityIds = [...new Set([...incoming, ...outgoing].map((g) => g.identityId))];
  const localLinks = await db.patientHospitalLink.findMany({
    where: { hospitalId: session.hospitalId, identityId: { in: identityIds } },
    include: { patient: { select: { id: true, fullName: true, hospitalNumber: true } } },
  });
  const localPatientByIdentity = new Map(localLinks.map((l) => [l.identityId, l.patient]));
  const now = new Date();

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Record requests" description="Patient-authorized requests to share records between hospitals, outside a referral." />

      <Panel>
        <PanelHeader title={`Requests to this hospital · ${incoming.length}`} description="Another hospital is asking for records you hold. Release only what the patient authorized." />
        {incoming.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No requests received.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {incoming.map((g) => {
              const status = accessGrantDisplayStatus(g, now);
              const local = localPatientByIdentity.get(g.identityId);
              return (
                <li key={g.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {g.receivingHospital.name} · {g.requestingStaff?.fullName ?? "Unknown requester"}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        <span className="font-mono">{g.identity.universalPatientNumber}</span>
                        {local ? (
                          <> · <Link href={`/patients/${local.id}`} className="text-[var(--color-brand)] hover:underline">{local.fullName} ({local.hospitalNumber})</Link></>
                        ) : (
                          " · No local record for this identity"
                        )}
                        {" · "}{formatDate(g.createdAt)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-[var(--color-text-faint)]">Purpose</dt><dd>{g.purpose}</dd></div>
                    <div><dt className="text-xs text-[var(--color-text-faint)]">{status === "PENDING" ? "Requested" : "Released"}</dt><dd>{categories(g.recordCategories)}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-xs text-[var(--color-text-faint)]">Patient authorization evidence</dt><dd className="text-[var(--color-text-muted)]">{g.authorizationEvidence ?? "—"}</dd></div>
                    {g.expiresAt && status === "ACTIVE" && <div><dt className="text-xs text-[var(--color-text-faint)]">Expires</dt><dd>{formatDate(g.expiresAt)}</dd></div>}
                  </dl>
                  {status === "PENDING" && canDecide && (
                    <div className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
                      {local ? (
                        <ApproveRequestForm grantId={g.id} requestedCategories={g.recordCategories} />
                      ) : (
                        <p className="text-sm text-[var(--color-text-muted)]">This hospital holds no record for this CareNexa identity, so nothing can be released.</p>
                      )}
                      <DeclineRequestForm grantId={g.id} />
                    </div>
                  )}
                  {status === "ACTIVE" && canRevoke && (
                    <form action={revokePatientAccessGrantAction} className="flex justify-end">
                      <input type="hidden" name="grantId" value={g.id} />
                      <Button type="submit" variant="danger" size="sm">Revoke access</Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title={`Requests from this hospital · ${outgoing.length}`} description="Records appear on the patient's record once released, and stop appearing when revoked or expired." />
        {outgoing.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No requests sent. Request records from a patient&rsquo;s record page.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {outgoing.map((g) => {
              const status = accessGrantDisplayStatus(g, now);
              const local = localPatientByIdentity.get(g.identityId);
              return (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      From {g.sourceHospital.name} · {local ? <Link href={`/patients/${local.id}`} className="text-[var(--color-brand)] hover:underline">{local.fullName}</Link> : g.identity.universalPatientNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {categories(g.recordCategories)} · {g.purpose} · {formatDate(g.createdAt)}
                      {status === "ACTIVE" && g.expiresAt ? ` · until ${formatDate(g.expiresAt)}` : ""}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
