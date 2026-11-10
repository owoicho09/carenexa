import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { RegisterForm } from "./RegisterForm";
import { requireSession } from "@/lib/auth";

export default async function RegisterPatientPage() {
  const session = await requireSession();
  const cardTypes = await db.cardType.findMany({ where: { hospitalId: session.hospitalId }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Register new patient" description="Capture identity, demographics, and next of kin, then issue a hospital number." />
      <Panel className="p-6">
        <RegisterForm cardTypes={cardTypes.map((c) => ({ id: c.id, name: c.name, seriesCode: c.seriesCode }))} />
      </Panel>
    </div>
  );
}
