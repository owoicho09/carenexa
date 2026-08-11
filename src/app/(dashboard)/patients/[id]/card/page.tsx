import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PrintButton } from "@/components/patient/PrintButton";
import { Logo } from "@/components/ui/Logo";

export default async function PatientCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id }, include: { cardType: true } });
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/patients/${patient.id}`} className="text-sm text-[var(--color-brand)] hover:underline">
          ← Back to record
        </Link>
        <PrintButton />
      </div>

      <p className="text-center text-xs text-[var(--color-text-muted)] print:hidden">
        Reissuing this card is the same as printing it again — the hospital number never changes.
      </p>

      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm print:shadow-none">
        <div className="bg-[var(--color-brand)] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/20 text-white">
              <Logo size={16} monochrome />
            </div>
            <span className="text-sm font-semibold">CareNexa Hospital</span>
          </div>
          <p className="mt-1 text-xs text-white/80">Patient Identification Card</p>
        </div>
        <div className="space-y-3 bg-[var(--color-surface)] p-5">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Name</p>
            <p className="text-base font-semibold text-[var(--color-text)]">{patient.fullName}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-2">
            <p className="text-[10px] font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Hospital Number</p>
            <p className="font-mono text-lg font-semibold tracking-wider text-[var(--color-text)]">{patient.hospitalNumber}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Card type</p>
              <p className="text-sm text-[var(--color-text)]">{patient.cardType.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Sex</p>
              <p className="text-sm text-[var(--color-text)]">{patient.sex === "MALE" ? "Male" : "Female"}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Date of birth</p>
              <p className="text-sm text-[var(--color-text)]">{patient.dateOfBirth.toLocaleDateString("en-NG")}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Blood group</p>
              <p className="text-sm text-[var(--color-text)]">{patient.bloodGroup ?? "—"}</p>
            </div>
          </div>
          <p className="border-t border-[var(--color-border)] pt-2 text-[10px] text-[var(--color-text-faint)]">
            Issued {patient.registeredAt.toLocaleDateString("en-NG")} &middot; Present this card at every visit.
          </p>
        </div>
      </div>
    </div>
  );
}
