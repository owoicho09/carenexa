import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { switchHospitalAction } from "../hospitalActions";
import { hospitalAccent } from "@/lib/hospitalTheme";

// Walkthrough patient: exists only at General Hospital, so the demo shows the
// receiving hospital registering a newly referred patient.
const DEMO_PATIENT = "Amina Bello";
const SHARED_PATIENT = "Adebayo Ogundimu";

type Step = {
  title: string;
  hospital: "A" | "B";
  detail: string;
  href?: string;
  linkLabel?: string;
  done: boolean;
};

const CONCEPTS = [
  {
    title: "The goal: continuity of care",
    body: "Every stage of a patient's journey — emergency, hospital care, rehabilitation, home and follow-up — connected, so no patient is forgotten, no information is lost and no stage is disconnected.",
  },
  {
    title: "Two hospitals, one network",
    body: "General Hospital and Specialist Hospital run on one CareNexa system but keep separate staff, patients and records. The coloured bar at the top shows which hospital you are working in.",
  },
  {
    title: "One CareNexa ID per patient",
    body: "A patient has one network ID. Each hospital keeps its own record for them, linked by that ID — records are never merged.",
  },
  {
    title: "The patient controls sharing",
    body: "Records only move between hospitals when the patient agrees, for the categories they choose, for a limited time. The receiving hospital must also check the patient's identity in person.",
  },
  {
    title: "CareNexa Connect referrals",
    body: "Refer a patient, track them through acceptance, check-in and treatment, and receive the care report back — with every step timestamped for both hospitals.",
  },
  {
    title: "AI that shows its working",
    body: "Clinical insights cite the exact records behind each observation, are labelled as suggestions, and never change the record without a clinician.",
  },
  {
    title: "Everything is audited",
    body: "Every view of shared records, consent, referral step and AI access is written to each hospital's audit log.",
  },
  {
    title: "What the demo shows",
    body: "A patient referred from General Hospital to Specialist Hospital, checked in, treated and discharged — with the care report returned home. That is continuity of care across hospitals.",
  },
];

export default async function GuidePage() {
  const session = await requireSession();
  const [hospitalA, hospitalB] = await Promise.all([
    db.hospital.findUnique({ where: { slug: "general-hospital" } }),
    db.hospital.findUnique({ where: { slug: "specialist-hospital" } }),
  ]);

  const [sharedPatient, crossHospitalPatient] = hospitalA
    ? await Promise.all([
        db.patient.findFirst({ where: { hospitalId: hospitalA.id, fullName: DEMO_PATIENT, isDeleted: false } }),
        db.patient.findFirst({ where: { hospitalId: hospitalA.id, fullName: SHARED_PATIENT, isDeleted: false } }),
      ])
    : [null, null];
  const verifiedAtA = sharedPatient
    ? Boolean(await db.patientIdentityVerification.findFirst({ where: { patientId: sharedPatient.id, hospitalId: hospitalA!.id, status: "VERIFIED", revokedAt: null } }))
    : false;

  // The most recent referral created during the demo (seeded history excluded).
  const recent = hospitalA && hospitalB
    ? await db.referral.findMany({
        where: { sourceHospitalId: hospitalA.id, destinationHospitalId: hospitalB.id },
        include: { events: { select: { status: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];
  const demoReferral = recent.find((r) => {
    const info = r.clinicalInformation as Record<string, unknown> | null;
    return !(info && typeof info === "object" && info.synthetic === true);
  });
  const reached = new Set(demoReferral?.events.map((e) => e.status) ?? []);
  const info = (demoReferral?.clinicalInformation ?? {}) as Record<string, unknown>;
  const report = info.counterReferral && typeof info.counterReferral === "object" ? info.counterReferral as { incorporatedAt?: string } : null;
  const referralHref = demoReferral ? `/referrals/${demoReferral.id}` : "/referrals";

  const steps: Step[] = [
    {
      title: `Open ${DEMO_PATIENT} and verify their identity`,
      hospital: "A",
      detail: "On the patient record, the CareNexa ID box shows the network ID. Enter how you checked identity (e.g. 'National ID sighted') and press Verify identity.",
      href: sharedPatient ? `/patients/${sharedPatient.id}` : "/patients",
      linkLabel: "Open patient",
      done: verifiedAtA,
    },
    {
      title: "Refer the patient to Specialist Hospital",
      hospital: "A",
      detail: "Further down the patient record, use “Refer to another hospital”: choose Specialist Hospital, describe the requested service (e.g. Endocrinology review for diabetes) and the reason.",
      href: sharedPatient ? `/patients/${sharedPatient.id}` : "/patients",
      linkLabel: "Open patient",
      done: Boolean(demoReferral),
    },
    {
      title: "Record the patient's consent and send",
      hospital: "A",
      detail: "On the referral, enter the consent reference and keep the record categories the patient agreed to. Press Authorize and send referral.",
      href: referralHref,
      linkLabel: "Open referral",
      done: reached.has("SUBMITTED"),
    },
    {
      title: "Confirm the patient's CareNexa ID",
      hospital: "B",
      detail: "Switch to Specialist Hospital and open the new referral. The CareNexa ID is hidden here — type it in from the patient's card (it is on their General Hospital record and printed card). If it matches, the patient is registered and acceptance unlocks.",
      href: referralHref,
      linkLabel: "Open referral",
      done: reached.has("ACKNOWLEDGED"),
    },
    {
      title: "Accept and check the patient in",
      hospital: "B",
      detail: "Under Next step, press Accept referral, then Confirm patient checked in. A visit opens for the patient at Specialist Hospital.",
      href: referralHref,
      linkLabel: "Open referral",
      done: reached.has("ARRIVAL_CONFIRMED") || reached.has("TREATMENT_IN_PROGRESS"),
    },
    {
      title: "See the check-in from the referrer",
      hospital: "A",
      detail: "Switch back to General Hospital and open the same referral: the tracker shows Checked in, with the time and who confirmed it.",
      href: referralHref,
      linkLabel: "Open referral",
      done: reached.has("ARRIVAL_CONFIRMED") || reached.has("TREATMENT_IN_PROGRESS"),
    },
    {
      title: "Treat, discharge and send the care report",
      hospital: "B",
      detail: "At Specialist Hospital press Start treatment, then Discharge patient. Write the care report and send it back with the patient's authorization.",
      href: referralHref,
      linkLabel: "Open referral",
      done: reached.has("COUNTER_REFERRAL_SUBMITTED"),
    },
    {
      title: "Store the report on the patient's record",
      hospital: "A",
      detail: "At General Hospital, open the referral and press Review and add to local visit. The report is saved in the patient's record as a note for clinician sign-off.",
      href: referralHref,
      linkLabel: "Open referral",
      done: Boolean(report?.incorporatedAt),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const hospitals = { A: hospitalA, B: hospitalB };
  const accent = { A: hospitalAccent("general-hospital"), B: hospitalAccent("specialist-hospital") };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <PageHeader
        title="Welcome to CareNexa"
        description="A prototype for continuity of care: one patient journey, connected across hospitals. Start with the ideas below, then follow the walkthrough — about ten minutes."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONCEPTS.map((c) => (
          <Panel key={c.title} className="p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">{c.title}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{c.body}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader
          title={`Demo walkthrough · ${doneCount} of ${steps.length} done`}
          description={demoReferral
            ? "Steps tick off automatically as the referral moves forward."
            : "Steps tick off automatically. All data is synthetic."}
        />
        {!session.isPlatformAdmin && (
          <p className="mx-5 mt-4 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] px-3 py-2 text-sm text-[var(--color-text)]">
            You are signed in to one hospital only. To switch between hospitals during the demo, sign in with the master demo account.
          </p>
        )}
        <ol className="divide-y divide-[var(--color-border)]">
          {steps.map((step, i) => {
            const target = hospitals[step.hospital];
            const here = target?.id === session.hospitalId;
            const nextUp = !step.done && steps.slice(0, i).every((s) => s.done);
            return (
              <li key={step.title} className={`flex gap-4 px-5 py-4 ${nextUp ? "bg-[var(--color-brand-soft)]" : ""}`}>
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${step.done ? "border-[var(--color-success)] bg-[var(--color-success)] text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{step.title}</p>
                    {target && (
                      <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: accent[step.hospital], color: accent[step.hospital] }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent[step.hospital] }} />
                        {target.name}
                      </span>
                    )}
                    {nextUp && <span className="text-[11px] font-semibold tracking-wide text-[var(--color-brand)] uppercase">Next</span>}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{step.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {target && !here && session.isPlatformAdmin && (
                      <form action={switchHospitalAction}>
                        <input type="hidden" name="hospitalId" value={target.id} />
                        <input type="hidden" name="returnTo" value="/guide" />
                        <button type="submit" className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: accent[step.hospital] }}>
                          Switch to {target.name}
                        </button>
                      </form>
                    )}
                    {step.href && (here || !session.isPlatformAdmin) && (
                      <Link href={step.href} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-page)]">
                        {step.linkLabel} →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel>
        <PanelHeader title="More to show" description="Optional extras once the referral is complete." />
        <ul className="space-y-2 p-5 text-sm text-[var(--color-text-muted)]">
          <li>
            <span className="font-medium text-[var(--color-text)]">A patient known to both hospitals</span> — {crossHospitalPatient && session.hospitalId === hospitalA?.id
              ? <Link href={`/patients/${crossHospitalPatient.id}`} className="text-[var(--color-brand)] hover:underline">{SHARED_PATIENT}</Link>
              : SHARED_PATIENT} has one CareNexa ID with a separate record at each hospital, and a completed referral in his history.
          </li>
          <li><span className="font-medium text-[var(--color-text)]">AI clinical insights</span> — on any patient record, under Clinical intelligence. Rule-based flags appear without AI; AI observations need an OpenAI key.</li>
          <li><span className="font-medium text-[var(--color-text)]">Request records</span> — from Specialist Hospital, use “Request records from another hospital” on a verified patient, then release it at General Hospital under <Link href="/access-requests" className="text-[var(--color-brand)] hover:underline">Record requests</Link>.</li>
          <li><span className="font-medium text-[var(--color-text)]">Pilot metrics</span> — the hospital overview shows referral performance calculated from recorded events.</li>
          <li><span className="font-medium text-[var(--color-text)]">Audit log</span> — Admin → Audit Log shows every access and decision for the hospital you are in.</li>
        </ul>
      </Panel>
    </div>
  );
}
