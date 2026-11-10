// Readable view of the consent-filtered snapshot attached to a referral.
// Only renders the categories that are present — i.e. what the patient agreed
// to share. Server component; no data access of its own.

type Row = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.filter((x): x is Row => Boolean(x) && typeof x === "object") : []);
const date = (v: unknown) => {
  const d = new Date(str(v));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NG", { dateStyle: "medium" });
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">{title}</p>
      {children}
    </div>
  );
}

export function SharedClinicalSummary({ information }: { information: Record<string, unknown> }) {
  const patient = information.patient && typeof information.patient === "object" ? (information.patient as Row) : null;
  const visit = information.visit && typeof information.visit === "object" ? (information.visit as Row) : null;
  const vitals = rows(information.vitals);
  const labs = rows(information.labResults);
  const diagnoses = rows(information.diagnoses);
  const prescriptions = rows(information.prescriptions);
  const notes = rows(information.notes);
  const empty = !patient && !visit && !vitals.length && !labs.length && !diagnoses.length && !prescriptions.length && !notes.length;

  if (empty) {
    return <p className="px-5 py-4 text-sm text-[var(--color-text-muted)]">No clinical records were attached to this referral.</p>;
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {patient && (
        <Section title="Patient">
          <p className="text-sm font-medium text-[var(--color-text)]">{str(patient.fullName)}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {str(patient.sex) === "MALE" ? "Male" : "Female"} · born {date(patient.dateOfBirth)} · blood group {str(patient.bloodGroup) || "unknown"} · genotype {str(patient.genotype) || "unknown"}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Allergies: {Array.isArray(patient.allergies) && patient.allergies.length ? patient.allergies.join(", ") : "none recorded"}
          </p>
        </Section>
      )}
      {visit && (
        <Section title="Referring visit">
          <p className="text-sm text-[var(--color-text)]">{date(visit.openedAt)} · {str(visit.presentingComplaint) || "No presenting complaint recorded"}</p>
        </Section>
      )}
      {vitals.length > 0 && (
        <Section title="Vitals">
          <ul className="space-y-0.5 text-sm text-[var(--color-text)]">
            {vitals.map((v, i) => (
              <li key={i}>
                {date(v.recordedAt)} · BP {str(v.systolicBp) || "?"}/{str(v.diastolicBp) || "?"} · temp {str(v.temperatureC) || "?"}°C · pulse {str(v.pulseBpm) || "?"} · weight {str(v.weightKg) || "?"} kg
              </li>
            ))}
          </ul>
        </Section>
      )}
      {labs.length > 0 && (
        <Section title="Laboratory results">
          <ul className="space-y-0.5 text-sm text-[var(--color-text)]">
            {labs.map((l, i) => (
              <li key={i}>
                {str(l.testName)}: {l.resultType === "QUALITATIVE" ? str(l.qualitativeValue) : `${str(l.value)} ${str(l.unit)}`}
                {l.isAbnormal ? <span className="ml-1 font-medium text-[var(--color-danger)]">(abnormal)</span> : null}
                <span className="text-[var(--color-text-faint)]"> · {date(l.enteredAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {diagnoses.length > 0 && (
        <Section title="Diagnoses and plans">
          {diagnoses.map((d, i) => (
            <div key={i} className="text-sm">
              <p className="text-[var(--color-text)]">{str(d.description)}</p>
              <p className="text-[var(--color-text-muted)]">Plan: {str(d.plan)}</p>
            </div>
          ))}
        </Section>
      )}
      {prescriptions.length > 0 && (
        <Section title="Prescriptions">
          <ul className="space-y-0.5 text-sm text-[var(--color-text)]">
            {prescriptions.map((p, i) => <li key={i}>{str(p.drugName)} {str(p.dosage)} {str(p.frequency)} for {str(p.duration)}</li>)}
          </ul>
        </Section>
      )}
      {notes.length > 0 && (
        <Section title="Clinical notes">
          {notes.map((n, i) => <p key={i} className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{str(n.content)}</p>)}
        </Section>
      )}
    </div>
  );
}
