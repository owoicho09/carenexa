import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { EditPatientForm } from "./EditPatientForm";
import { requireSession } from "@/lib/auth";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const patient = await db.patient.findFirst({ where: { id, hospitalId: session.hospitalId } });
  if (!patient) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={`Edit ${patient.fullName}`} description="Card type and hospital number are permanent and can't be changed here." />
      <Panel className="p-6">
        <EditPatientForm
          patient={{
            id: patient.id,
            fullName: patient.fullName,
            dateOfBirth: patient.dateOfBirth.toISOString().slice(0, 10),
            sex: patient.sex,
            phone: patient.phone,
            address: patient.address,
            bloodGroup: patient.bloodGroup ?? "",
            genotype: patient.genotype ?? "",
            allergies: patient.allergies.join(", "),
            nextOfKinName: patient.nextOfKinName,
            nextOfKinPhone: patient.nextOfKinPhone,
            nextOfKinRelation: patient.nextOfKinRelation,
          }}
        />
      </Panel>
    </div>
  );
}
