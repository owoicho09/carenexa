import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { logAudit } from "@/lib/audit";
import { canReadSharedPatientRecords } from "@/lib/tenantAccess";
import { endEmergencyAccessAction, revokePatientAccessGrantAction } from "../actions";
import { CounterReferralForm, EmergencyAccessForm, EmergencySubmitForm, IncomingIdentityForm, IncorporateCounterReferralForm, ReferralConsentForm, ReferralNextSteps, RegisterReferredPatientForm, RetrospectiveAuthorizationForm } from "@/components/referrals/ReferralWorkflowForms";
import { IdentityVerificationForm } from "@/components/patient/IdentityVerificationForm";
import { allowedTransitions, isClosedWithoutCare, progressState } from "@/lib/referralRules";
import { SharedClinicalSummary } from "@/components/referrals/SharedClinicalSummary";

export default async function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const referral = await db.referral.findFirst({
    where: { id, OR: [{ sourceHospitalId: session.hospitalId }, { destinationHospitalId: session.hospitalId }] },
    include: {
      identity: true,
      sourceHospital: true,
      destinationHospital: true,
      referringStaff: true,
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!referral) notFound();

  const isSource = referral.sourceHospitalId === session.hospitalId;
  const localLink = await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId }, include: { patient: true } });
  const localVerification = localLink
    ? await db.patientIdentityVerification.findFirst({
        where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: localLink.patientId, status: "VERIFIED", revokedAt: null },
      })
    : null;
  const now = new Date();
  const inboundGrant = !isSource
    ? await db.patientAccessGrant.findFirst({
        where: {
          referralId: referral.id,
          identityId: referral.identityId,
          sourceHospitalId: referral.sourceHospitalId,
          receivingHospitalId: session.hospitalId,
          status: "ACTIVE",
          revokedAt: null,
          authorizedAt: { not: null },
          AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        },
      })
    : null;
  const emergencyEvent = !isSource
    ? await db.emergencyAccessEvent.findFirst({
        where: {
          referralId: referral.id,
          identityId: referral.identityId,
          sourceHospitalId: referral.sourceHospitalId,
          accessingHospitalId: session.hospitalId,
          endedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const sourceGrant = await db.patientAccessGrant.findFirst({
        where: {
          referralId: referral.id,
          sourceHospitalId: session.hospitalId,
          status: "ACTIVE",
          revokedAt: null,
          AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        },
        orderBy: { createdAt: "desc" },
      });
  const outboundCounterGrant = isSource
    ? await db.patientAccessGrant.findFirst({
        where: {
          referralId: referral.id,
          identityId: referral.identityId,
          sourceHospitalId: referral.destinationHospitalId,
          receivingHospitalId: session.hospitalId,
          status: "ACTIVE",
          revokedAt: null,
          recordCategories: { has: "COUNTER_REFERRAL" },
          AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        },
      })
    : null;
  const canViewSharedRecords = isSource || canReadSharedPatientRecords({
    receivingIdentityVerified: Boolean(localLink?.verificationStatus === "VERIFIED" && localVerification),
    grant: inboundGrant,
    emergencyAccess: emergencyEvent,
    now,
  });
  const info = referral.clinicalInformation && typeof referral.clinicalInformation === "object" && !Array.isArray(referral.clinicalInformation)
    ? referral.clinicalInformation as Record<string, unknown>
    : {};
  const counterReferral = outboundCounterGrant && localVerification && typeof info.counterReferral === "object" && info.counterReferral
    ? info.counterReferral as { summary?: string; createdAt?: string; incorporatedAt?: string }
    : null;
  const eventStatuses = referral.events.map((e) => e.status);
  const progress = progressState(eventStatuses);
  const closedWithoutCare = isClosedWithoutCare(eventStatuses);
  const nextActor = referral.status === "DRAFT" || referral.status === "MORE_INFORMATION_REQUESTED"
    ? referral.sourceHospital.name
    : ["COMPLETED", "DECLINED", "REDIRECTED"].includes(referral.status) ? null : referral.destinationHospital.name;
  // Demographics the patient consented to share, so the receiving hospital can
  // register them on arrival without re-typing.
  const sharedDemographics = !isSource && inboundGrant?.recordCategories.includes("DEMOGRAPHICS") && info.patient && typeof info.patient === "object"
    ? info.patient as { fullName?: string; dateOfBirth?: string; sex?: string; phone?: string }
    : null;
  const nextStatuses: string[] = allowedTransitions({ isRecipient: !isSource, status: referral.status, urgency: referral.urgency });
  const emergencyInfo = info.emergency && typeof info.emergency === "object" ? info.emergency as { justification?: string; patientAuthorization?: string } : null;
  const authorizationPending = emergencyInfo?.patientAuthorization === "PENDING";
  const referralClosed = ["DRAFT", "DECLINED", "COMPLETED"].includes(referral.status);

  if (!isSource && canViewSharedRecords) {
    await logAudit({
      hospitalId: session.hospitalId,
      actorId: session.staffId,
      action: emergencyEvent ? "EMERGENCY_SHARED_RECORDS_VIEWED" : "SHARED_RECORDS_VIEWED",
      targetType: "Referral",
      targetId: referral.id,
      targetLabel: referral.identity.universalPatientNumber,
      detail: emergencyEvent ? `Emergency access event ${emergencyEvent.id}` : `Access grant ${inboundGrant?.id}`,
    });
  }
  if (isSource && counterReferral) {
    await logAudit({
      hospitalId: session.hospitalId,
      actorId: session.staffId,
      action: "COUNTER_REFERRAL_VIEWED",
      targetType: "Referral",
      targetId: referral.id,
      targetLabel: referral.identity.universalPatientNumber,
      detail: `Access grant ${outboundCounterGrant?.id}`,
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <PageHeader title={referral.requestedService} description={`${referral.sourceHospital.name} → ${referral.destinationHospital.name}`} />

      <Panel className="p-5">
        <ol className="grid grid-cols-4 gap-y-3 sm:grid-cols-8" aria-label="Referral progress">
          {progress.map((step, i) => (
            <li key={step.label} className="flex flex-col items-center text-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${step.done ? "border-[var(--color-success)] bg-[var(--color-success)] text-white" : "border-[var(--color-border)] text-[var(--color-text-faint)]"}`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className={`mt-1 text-[11px] ${step.done ? "font-medium text-[var(--color-text)]" : "text-[var(--color-text-faint)]"}`}>{step.label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-text-muted)]">
          {closedWithoutCare
            ? `Closed by ${referral.destinationHospital.name} — see the timeline for the reason.`
            : nextActor
              ? <>Waiting on <span className="font-semibold text-[var(--color-text)]">{nextActor}</span>{nextActor === (isSource ? referral.sourceHospital.name : referral.destinationHospital.name) ? " (you)" : ""}.</>
              : "This referral is complete."}
          {isSource && localLink && <> · <Link href={`/patients/${localLink.patientId}`} className="text-[var(--color-brand)] hover:underline">Patient record</Link></>}
        </p>
      </Panel>

      <Panel>
        <PanelHeader title="Referral details" description="Referral metadata does not grant access to the patient's full record." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div><p className="text-xs text-[var(--color-text-faint)]">CareNexa identity</p><p className="font-mono text-sm">{referral.identity.universalPatientNumber}</p></div>
          <div><p className="text-xs text-[var(--color-text-faint)]">Status</p><Badge tone={referral.status === "COMPLETED" ? "success" : "brand"}>{referral.status.replaceAll("_", " ")}</Badge></div>
          <div><p className="text-xs text-[var(--color-text-faint)]">Referring clinician</p><p className="text-sm">{referral.referringStaff.fullName}</p></div>
          <div><p className="text-xs text-[var(--color-text-faint)]">Urgency</p><p className="text-sm">{referral.urgency}</p></div>
          <div className="sm:col-span-2"><p className="text-xs text-[var(--color-text-faint)]">Reason</p><p className="text-sm">{referral.reason}</p></div>
        </div>
      </Panel>

      {emergencyInfo && (
        <div className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          <p className="font-semibold">Emergency referral{authorizationPending ? " — submitted without patient authorization" : ""}</p>
          {emergencyInfo.justification && <p className="mt-1">{emergencyInfo.justification}</p>}
          <p className="mt-1 text-xs">
            {authorizationPending
              ? "No clinical content was shared. The receiving hospital may open time-limited, audited emergency access; the referring hospital must record patient authorization once obtainable."
              : "Patient authorization has since been recorded."}
          </p>
        </div>
      )}

      {isSource && referral.status === "DRAFT" && !localVerification && localLink && (
        <Panel className="border-l-4 border-l-[var(--color-warning)] p-5">
          <h2 className="mb-1 text-sm font-semibold">Step 1 · Verify the patient&rsquo;s identity</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Confirm in person that this is {localLink.patient.fullName} before sending their records anywhere.</p>
          <IdentityVerificationForm patientId={localLink.patientId} />
        </Panel>
      )}

      {isSource && referral.status === "DRAFT" && (
        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold">{localVerification ? "Patient authorization" : "Step 2 · Patient authorization"}</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Record the authorization evidence and choose only the record categories the patient agreed to share.</p>
          <ReferralConsentForm referralId={referral.id} />
        </Panel>
      )}

      {isSource && referral.status === "DRAFT" && referral.urgency === "EMERGENCY" && (session.role === "ADMIN" || session.role === "CLINICIAN") && (
        <Panel className="border-l-4 border-l-[var(--color-danger)] p-5">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-danger)]">Patient cannot authorize? Submit as emergency</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Sends the referral immediately with no clinical content attached. The justification is recorded on the timeline and in the audit log.</p>
          <EmergencySubmitForm referralId={referral.id} />
        </Panel>
      )}

      {isSource && authorizationPending && !referralClosed && (session.role === "ADMIN" || session.role === "CLINICIAN") && (
        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Record patient authorization (retrospective)</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Once the patient can decide, record their authorization. Only the categories they agree to will be shared.</p>
          <RetrospectiveAuthorizationForm referralId={referral.id} />
        </Panel>
      )}

      {!isSource && !localLink && !closedWithoutCare && referral.status !== "COMPLETED" && (
        <Panel className="border-l-4 border-l-[var(--color-brand)] p-5">
          <h2 className="mb-1 text-sm font-semibold">Register the patient at this hospital</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            This patient has no record here yet. Check their identity in person, then create this hospital&rsquo;s own record, linked to the same CareNexa ID.
          </p>
          <RegisterReferredPatientForm referralId={referral.id} shared={sharedDemographics} />
        </Panel>
      )}

      {!isSource && localLink && !localVerification && (
        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Verify patient identity in person</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">This patient already has a record here ({localLink.patient.hospitalNumber}). Confirm in person that it is them.</p>
          <IncomingIdentityForm referralId={referral.id} linkedPatientId={localLink.patientId} localPatients={[localLink.patient]} />
        </Panel>
      )}

      {canViewSharedRecords ? (
        <Panel>
          <PanelHeader title="Shared clinical information" description={isSource ? "What you sent, limited to the categories the patient agreed to." : `From ${referral.sourceHospital.name}, limited to what the patient agreed to share.`} />
          {emergencyEvent && <p className="mx-5 mt-4 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">Emergency access: {emergencyEvent.reason} · expires {emergencyEvent.expiresAt.toLocaleString()}</p>}
          {!isSource && localLink && (
            <p className="mx-5 mt-4 text-sm">
              <Link href={`/patients/${localLink.patientId}`} className="font-medium text-[var(--color-brand)] hover:underline">
                Open the local patient record
              </Link>
              <span className="text-[var(--color-text-muted)]"> to see the source hospital&rsquo;s records this access covers.</span>
            </p>
          )}
          <SharedClinicalSummary information={info} />
        </Panel>
      ) : !isSource && referral.status !== "DRAFT" ? (
        <Panel className="p-5"><p className="text-sm text-[var(--color-warning)]">Clinical content remains locked until the patient&rsquo;s identity is verified in person and the authorization grant is active.</p></Panel>
      ) : null}

      {isSource && sourceGrant && (
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Patient access grant</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Active until {sourceGrant.expiresAt?.toLocaleString() ?? "revoked"} · {sourceGrant.recordCategories.join(", ")}</p></div>
            <form action={revokePatientAccessGrantAction}>
              <input type="hidden" name="grantId" value={sourceGrant.id} />
              <Button type="submit" variant="danger" size="sm">Revoke access</Button>
            </form>
          </div>
        </Panel>
      )}

      {!isSource && !canViewSharedRecords && (session.role === "ADMIN" || session.role === "CLINICIAN") && referral.status !== "DRAFT" && referral.status !== "DECLINED" && referral.status !== "COMPLETED" && (
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-danger)]">Emergency access</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Use only when necessary for immediate care. This creates a one-hour, reasoned, audited access event separate from patient authorization.</p>
          <EmergencyAccessForm referralId={referral.id} />
        </Panel>
      )}

      {!isSource && emergencyEvent && (session.role === "ADMIN" || session.role === "CLINICIAN") && (
        <form action={endEmergencyAccessAction} className="flex justify-end">
          <input type="hidden" name="eventId" value={emergencyEvent.id} />
          <Button type="submit" variant="secondary" size="sm">End emergency access</Button>
        </form>
      )}

      {nextStatuses.length > 0 && (
        <Panel className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Next step</h2>
          <ReferralNextSteps referralId={referral.id} statuses={nextStatuses} />
        </Panel>
      )}

      {!isSource && referral.status === "DISCHARGED" && (
        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Send the care report back to {referral.sourceHospital.name}</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Summarise the treatment and follow-up plan. It is sent with the patient&rsquo;s authorization and stored on their record at {referral.sourceHospital.name}.</p>
          <CounterReferralForm referralId={referral.id} />
        </Panel>
      )}

      {isSource && counterReferral && (
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Care report from {referral.destinationHospital.name}</h2>
            {counterReferral.incorporatedAt
              ? <Badge tone="success">Stored on patient record</Badge>
              : <Badge tone="warning">Awaiting review</Badge>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{counterReferral.summary}</p>
          <p className="mt-2 text-xs text-[var(--color-text-faint)]">
            Returned {counterReferral.createdAt ? new Date(counterReferral.createdAt).toLocaleString() : ""}
            {counterReferral.incorporatedAt ? ` · stored ${new Date(counterReferral.incorporatedAt).toLocaleString()}` : ""}
          </p>
          {!counterReferral.incorporatedAt && (session.role === "ADMIN" || session.role === "CLINICIAN") && (
            <IncorporateCounterReferralForm referralId={referral.id} />
          )}
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Referral timeline" />
        <ol className="divide-y divide-[var(--color-border)]">
          {referral.events.map((event) => (
            <li key={event.id} className="px-5 py-3">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-sm font-medium text-[var(--color-text)]">{event.status.replaceAll("_", " ")}</p>
                <time className="text-xs text-[var(--color-text-faint)]">{event.createdAt.toLocaleString()}</time>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{event.actor.fullName}{event.detail ? ` · ${event.detail}` : ""}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
