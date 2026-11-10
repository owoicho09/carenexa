import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { EditDepartmentForm } from "./EditDepartmentForm";
import { requireSession } from "@/lib/auth";

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["ADMIN"]);
  const department = await db.department.findFirst({ where: { id, hospitalId: session.hospitalId } });
  if (!department) notFound();

  const resultFieldLabels = ((department.resultFields as { fields?: { label: string }[] })?.fields ?? [])
    .map((f) => f.label)
    .join(", ");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={`Edit ${department.name}`} />
      <Panel className="p-6">
        <EditDepartmentForm
          department={{
            id: department.id,
            name: department.name,
            slug: department.slug,
            description: department.description,
            acceptsRequestTypes: department.acceptsRequestTypes.join(", "),
            resultFields: resultFieldLabels,
          }}
        />
      </Panel>
    </div>
  );
}
